import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { criarCliente, type Cliente, type Tokens } from '../api/cliente';
import { enderecoDaApi } from '../api/endereco';
import { apagarTokens, guardarTokens, lerTokens } from '../api/guarda';

/**
 * A sessão do aluno.
 *
 * Diferente do painel web, aqui os tokens ficam no armazenamento seguro do
 * aparelho e sobrevivem ao fechamento do app. O aluno entra uma vez e continua
 * entrando, que é o que se espera de um aplicativo.
 */

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: 'aluno' | 'professor';
  fuso: string;
}

interface Sessao {
  usuario: Usuario | null;
  carregando: boolean;
  cliente: Cliente;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const ContextoDaSessao = createContext<Sessao | null>(null);

export function ProvedorDeSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  const cliente = useMemo(
    () =>
      criarCliente({
        baseUrl: enderecoDaApi(),
        obterTokens: lerTokens,
        salvarTokens: guardarTokens,
        aoPerderSessao: async () => {
          await apagarTokens();
          setUsuario(null);
        },
      }),
    [],
  );

  /**
   * Retoma a sessão ao abrir o app.
   *
   * Sem isto, quem já entrou veria a tela de login toda vez, e a escolha de
   * guardar no armazenamento seguro não serviria para nada.
   */
  useEffect(() => {
    let ativo = true;

    void (async () => {
      try {
        const dados = await cliente.chamar<{ usuario: Usuario }>('/eu');
        if (ativo) setUsuario(dados.usuario);
      } catch {
        if (ativo) setUsuario(null);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [cliente]);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const dados = await cliente.chamar<Tokens & { usuario: Usuario }>('/sessoes', {
        metodo: 'POST',
        corpo: { email, senha },
        publica: true,
      });

      await guardarTokens({ acesso: dados.acesso, renovacao: dados.renovacao });
      setUsuario(dados.usuario);
    },
    [cliente],
  );

  const sair = useCallback(async () => {
    try {
      await cliente.chamar('/sessoes', { metodo: 'DELETE' });
    } catch {
      // O token expira sozinho no servidor. Prender a pessoa numa sessão que
      // ela pediu para encerrar é pior que a chamada falhar.
    }

    await apagarTokens();
    setUsuario(null);
  }, [cliente]);

  const valor = useMemo(
    () => ({ usuario, carregando, cliente, entrar, sair }),
    [usuario, carregando, cliente, entrar, sair],
  );

  return <ContextoDaSessao.Provider value={valor}>{children}</ContextoDaSessao.Provider>;
}

export function useSessao(): Sessao {
  const contexto = useContext(ContextoDaSessao);
  if (!contexto) throw new Error('useSessao precisa estar dentro de ProvedorDeSessao.');
  return contexto;
}
