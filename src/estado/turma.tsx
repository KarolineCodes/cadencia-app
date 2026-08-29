import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { buscarTurmas } from '../api/estudo';
import { diaDeEstudoDe, type DiaDeEstudo } from '../dominio/dia-de-estudo';
import { useSessao } from './sessao-provedor';

/**
 * A turma e o dia, num lugar só.
 *
 * Sem isto, cada aba buscaria a turma por conta e a mesma requisição sairia
 * quatro vezes ao abrir o app. Pior: as abas poderiam discordar sobre qual é o
 * dia, e a de progresso mostraria uma sequência que a de estudar contradiz.
 *
 * O dia é calculado a partir do **fuso do aluno**, e não do aparelho. Quem
 * viaja continua estudando no próprio calendário.
 */

interface Contexto {
  turmaId: string | null;
  dia: DiaDeEstudo | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

const ContextoDaTurma = createContext<Contexto | null>(null);

export function ProvedorDeTurma({ children }: { children: ReactNode }) {
  const { usuario, cliente } = useSessao();

  const [turmaId, setTurmaId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const dia = usuario ? diaDeEstudoDe(new Date(), usuario.fuso) : null;

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const turmas = await buscarTurmas(cliente);
      const primeira = turmas[0];

      if (!primeira) {
        setErro('Você ainda não está em uma turma.');
        return;
      }

      setTurmaId(primeira.id);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para carregar.');
    } finally {
      setCarregando(false);
    }
  }, [cliente]);

  useEffect(() => {
    if (usuario) void recarregar();
  }, [usuario, recarregar]);

  const valor = useMemo(
    () => ({ turmaId, dia, carregando, erro, recarregar }),
    [turmaId, dia, carregando, erro, recarregar],
  );

  return <ContextoDaTurma.Provider value={valor}>{children}</ContextoDaTurma.Provider>;
}

export function useTurma(): Contexto {
  const contexto = useContext(ContextoDaTurma);
  if (!contexto) throw new Error('useTurma precisa estar dentro de ProvedorDeTurma.');
  return contexto;
}
