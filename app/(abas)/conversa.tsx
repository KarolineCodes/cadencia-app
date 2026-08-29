import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buscarConversa,
  buscarConversas,
  comecarConversa,
  falar,
  type Conversa,
  type ConversaResumida,
} from '../../src/api/estudo';
import { Botao } from '../../src/componentes/Botao';
import { Carregando, Falhou } from '../../src/componentes/Estado';
import { useSessao } from '../../src/estado/sessao-provedor';
import { useTurma } from '../../src/estado/turma';
import { CANTO, ESPACO, PESO } from '../../src/tema/tema';
import { useTema } from '../../src/tema/contexto';

const CENARIOS = [
  'pedindo um café',
  'no aeroporto',
  'contando o fim de semana',
  'marcando uma consulta',
];

export default function TelaConversa() {
  const { turmaId, erro: erroDaTurma, recarregar } = useTurma();
  const [aberta, setAberta] = useState<string | null>(null);

  if (erroDaTurma) {
    return <Falhou mensagem={erroDaTurma} aoTentarDeNovo={() => void recarregar()} />;
  }

  if (!turmaId) return <Carregando />;

  return aberta ? (
    <Sala id={aberta} aoVoltar={() => setAberta(null)} />
  ) : (
    <Lista turmaId={turmaId} aoAbrir={setAberta} />
  );
}

function Lista({
  turmaId,
  aoAbrir,
}: {
  turmaId: string;
  aoAbrir: (id: string) => void;
}) {
  const tema = useTema();
  const { cliente } = useSessao();

  const [conversas, setConversas] = useState<ConversaResumida[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);

    try {
      setConversas(await buscarConversas(cliente, turmaId));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para carregar.');
    }
  }, [cliente, turmaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function comecar(cenario: string) {
    setCriando(true);

    try {
      const nova = await comecarConversa(cliente, turmaId, cenario, 'B1');
      aoAbrir(nova.id);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para começar.');
    } finally {
      setCriando(false);
    }
  }

  if (erro) return <Falhou mensagem={erro} aoTentarDeNovo={() => void carregar()} />;
  if (!conversas) return <Carregando />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tema.fundo }} edges={['top']}>
      <FlatList
        data={conversas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={estilos.pagina}
        ListHeaderComponent={
          <View style={estilos.abertura}>
            <Text style={[estilos.olho, { color: tema.violeta }]}>Conversação</Text>
            <Text style={[estilos.titulo, { color: tema.tinta }]}>Pratique falando</Text>
            <Text style={[estilos.nota, { color: tema.tintaMedia }]}>
              Escolha uma situação. Você escreve, recebe resposta e correções junto.
            </Text>

            <View style={estilos.cenarios}>
              {CENARIOS.map((cenario) => (
                <Botao
                  key={cenario}
                  titulo={cenario}
                  aparencia="secundario"
                  desabilitado={criando}
                  aoTocar={() => void comecar(cenario)}
                  estilo={estilos.cenario}
                />
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[estilos.item, { backgroundColor: tema.superficie, borderColor: tema.borda }]}>
            <View style={estilos.itemCorpo}>
              <Text style={[estilos.itemTitulo, { color: tema.tinta }]}>{item.cenario}</Text>
              <Text style={[estilos.itemApoio, { color: tema.tintaFraca }]}>
                {item.falas} {item.falas === 1 ? 'fala sua' : 'falas suas'}
                {item.encerrada ? ', encerrada' : ''}
              </Text>
            </View>

            <Botao
              titulo={item.encerrada ? 'Rever' : 'Continuar'}
              aparencia="secundario"
              aoTocar={() => aoAbrir(item.id)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Sala({ id, aoVoltar }: { id: string; aoVoltar: () => void }) {
  const tema = useTema();
  const { cliente } = useSessao();
  const lista = useRef<FlatList<Conversa['falas'][number]>>(null);

  const [conversa, setConversa] = useState<Conversa | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);

    try {
      setConversa(await buscarConversa(cliente, id));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para carregar.');
    }
  }, [cliente, id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviar() {
    const mensagem = texto.trim();
    if (!mensagem || !conversa) return;

    setEnviando(true);
    setTexto('');

    try {
      await falar(cliente, id, mensagem);
      // Recarrega em vez de acrescentar à mão: o servidor decide quais
      // correções são válidas, e montar a fala aqui duplicaria essa regra.
      await carregar();
    } catch (falha) {
      setTexto(mensagem);
      setErro(falha instanceof Error ? falha.message : 'Não deu para enviar.');
    } finally {
      setEnviando(false);
    }
  }

  if (erro && !conversa) return <Falhou mensagem={erro} aoTentarDeNovo={() => void carregar()} />;
  if (!conversa) return <Carregando />;

  const acabou = conversa.restantes === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tema.fundo }} edges={['top']}>
      <KeyboardAvoidingView
        style={estilos.sala}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={estilos.salaTopo}>
          <Botao titulo="← Voltar" aparencia="secundario" aoTocar={aoVoltar} />

          <Text style={[estilos.salaCenario, { color: tema.tinta }]} numberOfLines={1}>
            {conversa.cenario}
          </Text>
        </View>

        <FlatList
          ref={lista}
          data={conversa.falas}
          keyExtractor={(_, indice) => String(indice)}
          contentContainerStyle={estilos.falas}
          onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View
              style={[
                estilos.fala,
                item.autor === 'aluno'
                  ? { alignSelf: 'flex-end', backgroundColor: tema.violeta }
                  : {
                      alignSelf: 'flex-start',
                      backgroundColor: tema.superficie,
                      borderColor: tema.borda,
                      borderWidth: 1,
                    },
              ]}
            >
              <Text
                style={[
                  estilos.falaTexto,
                  { color: item.autor === 'aluno' ? tema.sobreCor : tema.tinta },
                ]}
              >
                {item.texto}
              </Text>

              {/* As correções ficam presas à fala que as gerou, e fora do fio
                  da conversa: corrigir dentro da resposta quebra o assunto. */}
              {item.correcoes.length > 0 && (
                <View style={estilos.correcoes}>
                  {item.correcoes.map((correcao, indice) => (
                    <Text key={indice} style={estilos.correcao}>
                      <Text style={{ color: tema.coralClaro, textDecorationLine: 'line-through' }}>
                        {correcao.trecho}
                      </Text>
                      <Text style={{ color: tema.sobreCor }}>{'  →  '}</Text>
                      <Text style={{ color: tema.mentaClaro }}>{correcao.sugestao}</Text>
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        />

        {acabou ? (
          <Text style={[estilos.encerrada, { color: tema.tintaFraca }]}>
            Esta conversa chegou ao fim. Comece outra para continuar praticando.
          </Text>
        ) : (
          <View style={[estilos.escrever, { borderTopColor: tema.borda }]}>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Escreva em inglês…"
              placeholderTextColor={tema.tintaFraca}
              accessibilityLabel="Sua mensagem"
              style={[
                estilos.entrada,
                { color: tema.tinta, backgroundColor: tema.superficie, borderColor: tema.borda },
              ]}
            />

            <Botao
              titulo={enviando ? '…' : 'Enviar'}
              aoTocar={() => void enviar()}
              desabilitado={enviando || texto.trim() === ''}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: ESPACO.medio, gap: ESPACO.pequeno },
  abertura: { marginBottom: ESPACO.medio },
  olho: {
    fontSize: 11,
    fontWeight: PESO.forte,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titulo: { marginTop: 2, fontSize: 26, fontWeight: PESO.maximo },
  nota: { marginTop: 6, fontSize: 14, fontWeight: PESO.normal, lineHeight: 20 },
  cenarios: { marginTop: ESPACO.medio, gap: ESPACO.pequeno },
  cenario: { alignItems: 'flex-start' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.medio,
    padding: ESPACO.medio,
    borderRadius: CANTO.medio,
    borderWidth: 2,
  },
  itemCorpo: { flex: 1, minWidth: 0 },
  itemTitulo: { fontSize: 15, fontWeight: PESO.forte },
  itemApoio: { marginTop: 2, fontSize: 12.5, fontWeight: PESO.normal },
  sala: { flex: 1 },
  salaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.medio,
    padding: ESPACO.medio,
  },
  salaCenario: { flex: 1, fontSize: 17, fontWeight: PESO.maximo },
  falas: { padding: ESPACO.medio, gap: ESPACO.pequeno + 2 },
  fala: { maxWidth: '86%', padding: ESPACO.medio, borderRadius: CANTO.grande },
  falaTexto: { fontSize: 15, fontWeight: PESO.normal, lineHeight: 21 },
  correcoes: {
    marginTop: ESPACO.pequeno + 2,
    paddingTop: ESPACO.pequeno,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    gap: 4,
  },
  correcao: { fontSize: 13.5, fontWeight: PESO.normal },
  escrever: {
    flexDirection: 'row',
    gap: ESPACO.pequeno,
    padding: ESPACO.medio,
    borderTopWidth: 1,
  },
  entrada: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: ESPACO.medio,
    fontSize: 15,
    borderWidth: 2,
    borderRadius: CANTO.medio,
  },
  encerrada: {
    padding: ESPACO.medio,
    fontSize: 13.5,
    fontWeight: PESO.normal,
    textAlign: 'center',
  },
});
