import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buscarSessao, enviarRevisoes } from '../../src/api/estudo';
import type { SessaoDoDia } from '../../src/api/estudo';
import {
  contarRevisoes,
  guardarLote,
  lerPendentes,
  novoLoteId,
  removerLote,
  type RevisaoPendente,
} from '../../src/estado/pendentes';
import { TelaEstudar } from '../../src/telas/TelaEstudar';
import { useSessao } from '../../src/estado/sessao-provedor';
import { Botao } from '../../src/componentes/Botao';
import { useTurma } from '../../src/estado/turma';
import { Carregando as TelaCarregando, Falhou } from '../../src/componentes/Estado';
import { useTema } from '../../src/tema/contexto';
import { ESPACO, PESO } from '../../src/tema/tema';

export default function Inicio() {
  const { usuario, cliente } = useSessao();
  const { turmaId, dia: diaDaTurma, erro: erroDaTurma, recarregar } = useTurma();
  const tema = useTema();

  const [dados, setDados] = useState<(SessaoDoDia & { turmaId: string }) | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const dia = diaDaTurma;

  const carregar = useCallback(async () => {
    if (!turmaId || !dia) return;

    try {
      const sessao = await buscarSessao(cliente, turmaId, dia);
      setDados({ ...sessao, turmaId });
    } catch (falha) {
      // A mensagem do servidor aparece como está: trocá-la por um texto
      // genérico apagaria justamente o que diz o que fazer.
      setErro(falha instanceof Error ? falha.message : 'Não deu para carregar.');
    }
  }, [cliente, turmaId, dia]);

  /**
   * Sobe o que está guardado.
   *
   * Chamado ao abrir e depois de cada sessão. Um lote só sai do disco depois da
   * confirmação do servidor: se a rede cair no meio, ele continua ali para a
   * próxima tentativa.
   */
  const subirPendentes = useCallback(async () => {
    const lotes = await lerPendentes();

    for (const lote of lotes) {
      try {
        await enviarRevisoes(cliente, lote.turmaId, lote.loteId, lote.revisoes);
        await removerLote(lote.loteId);
      } catch {
        // Para na primeira falha: se a rede caiu, as seguintes vão falhar
        // igual, e insistir gasta bateria sem chance de sucesso.
        break;
      }
    }

    setPendentes(contarRevisoes(await lerPendentes()));
  }, [cliente]);

  const enviar = useCallback(
    async (revisoes: RevisaoPendente[]) => {
      if (!dados) return;

      setEnviando(true);

      /*
       * O lote vai para o disco ANTES da tentativa.
       *
       * É o que garante que uma queda de rede, ou o app ser fechado no meio,
       * não apaga o que a pessoa acabou de estudar. O `loteId` nasce aqui, uma
       * vez, e é reusado em toda tentativa: o servidor reconhece o mesmo lote e
       * ignora o reenvio em vez de gravar tudo duas vezes.
       */
      const lote = {
        loteId: novoLoteId(),
        turmaId: dados.turmaId,
        revisoes,
        criadoEm: Date.now(),
      };

      await guardarLote(lote);
      setPendentes(contarRevisoes(await lerPendentes()));

      try {
        await enviarRevisoes(cliente, lote.turmaId, lote.loteId, lote.revisoes);
        await removerLote(lote.loteId);
        setPendentes(contarRevisoes(await lerPendentes()));
      } catch {
        // Sem erro na tela: o estudo está guardado, e assustar quem acabou de
        // estudar por causa de algo que já foi resolvido é pior que o silêncio.
      } finally {
        setEnviando(false);
      }
    },
    [cliente, dados],
  );

  // Ao abrir, tenta subir o que ficou de sessões anteriores.
  useEffect(() => {
    if (usuario) void subirPendentes();
  }, [usuario, subirPendentes]);

  if (erroDaTurma) {
    return <Falhou mensagem={erroDaTurma} aoTentarDeNovo={() => void recarregar()} />;
  }

  if (erro) {
    return (
      <Falhou
        mensagem={erro}
        aoTentarDeNovo={() => {
          setErro(null);
          setDados(null);
        }}
      />
    );
  }

  if (!dados) {
    /*
     * A busca acontece uma vez, e não a cada desenho.
     *
     * Chamar direto no corpo do componente dispararia uma requisição por
     * renderização, e cada resposta causaria outra: um laço que derruba o
     * servidor sem ninguém tocar em nada.
     */
    return <BuscandoSessao aoMontar={carregar} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tema.fundo }} edges={['top']}>
      <View style={estilos.cabecalho}>
        <Text style={[estilos.olho, { color: tema.violeta }]}>Estudar</Text>
        <Text style={[estilos.titulo, { color: tema.tinta }]}>
          {dados.cartas.length === 0
            ? 'Tudo em dia'
            : `${dados.cartas.length} para revisar`}
        </Text>
      </View>

      {pendentes > 0 && (
        <Text style={[estilos.pendentes, { color: tema.ambar }]}>
          {pendentes}{' '}
          {pendentes === 1 ? 'revisão guardada' : 'revisões guardadas'} para enviar
        </Text>
      )}

      <TelaEstudar
        cartas={dados.cartas}
        dia={dia!}
        aoTerminar={(revisoes) => void enviar(revisoes)}
        enviando={enviando}
      />
    </SafeAreaView>
  );
}

/** Dispara a busca uma vez, ao montar. */
function BuscandoSessao({ aoMontar }: { aoMontar: () => Promise<void> }) {
  useEffect(() => {
    void aoMontar();
  }, [aoMontar]);

  return <TelaCarregando texto="Buscando o que vence hoje…" />;
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACO.medio,
  },
  cabecalho: {
    paddingHorizontal: ESPACO.medio,
    paddingTop: ESPACO.medio,
  },
  olho: {
    fontSize: 11,
    fontWeight: PESO.forte,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titulo: {
    marginTop: 2,
    fontSize: 26,
    fontWeight: PESO.maximo,
  },
  aviso: {
    fontSize: 14,
    fontWeight: PESO.normal,
    textAlign: 'center',
  },
  acao: {
    minWidth: 220,
  },
  pendentes: {
    paddingHorizontal: ESPACO.medio,
    paddingTop: ESPACO.pequeno,
    fontSize: 13,
    fontWeight: PESO.forte,
  },
});
