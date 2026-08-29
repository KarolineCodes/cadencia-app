import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buscarRanking, type LinhaDoRanking } from '../../src/api/estudo';
import { Carregando, Falhou, Vazio } from '../../src/componentes/Estado';
import { useSessao } from '../../src/estado/sessao-provedor';
import { useTurma } from '../../src/estado/turma';
import { CANTO, ESPACO, PESO } from '../../src/tema/tema';
import { useTema } from '../../src/tema/contexto';

export default function Ranking() {
  const tema = useTema();
  const { cliente, usuario } = useSessao();
  const { turmaId, dia, erro: erroDaTurma, recarregar } = useTurma();

  const [linhas, setLinhas] = useState<LinhaDoRanking[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!turmaId || !dia) return;

    setErro(null);

    try {
      const dados = await buscarRanking(cliente, turmaId, dia);
      setLinhas(dados.ranking);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para carregar.');
    }
  }, [cliente, turmaId, dia]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erroDaTurma) return <Falhou mensagem={erroDaTurma} aoTentarDeNovo={() => void recarregar()} />;
  if (erro) return <Falhou mensagem={erro} aoTentarDeNovo={() => void carregar()} />;
  if (!linhas) return <Carregando texto="Buscando o ranking…" />;

  if (linhas.every((linha) => linha.xpNaSemana === 0)) {
    return (
      <Vazio
        titulo="A semana está começando"
        texto="Ninguém pontuou ainda. Quem estudar primeiro abre a lista."
      />
    );
  }

  const minha = linhas.find((linha) => linha.alunoId === usuario?.id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tema.fundo }} edges={['top']}>
      <View style={estilos.cabecalho}>
        <Text style={[estilos.olho, { color: tema.violeta }]}>Esta semana</Text>
        <Text style={[estilos.titulo, { color: tema.tinta }]}>
          {minha && minha.xpNaSemana > 0 ? `Você está em ${minha.posicao}º` : 'A turma'}
        </Text>

        {/* Explicar que zera toda semana é o que impede o ranking desanimar:
            sem isso, quem está atrás acha que nunca vai alcançar. */}
        <Text style={[estilos.nota, { color: tema.tintaMedia }]}>
          O ranking recomeça toda segunda. Quem estudou pouco ainda tem chance de virar.
        </Text>
      </View>

      <FlatList
        data={linhas}
        keyExtractor={(linha) => linha.alunoId}
        contentContainerStyle={estilos.lista}
        renderItem={({ item }) => {
          const eu = item.alunoId === usuario?.id;

          return (
            <View
              style={[
                estilos.linha,
                {
                  backgroundColor: eu ? tema.violetaClaro : tema.superficie,
                  borderColor: eu ? tema.violeta : tema.borda,
                },
              ]}
            >
              <Text
                style={[
                  estilos.posicao,
                  {
                    color: item.posicao <= 3 ? tema.sobreCor : tema.tintaMedia,
                    backgroundColor: item.posicao <= 3 ? tema.violeta : tema.fundo,
                  },
                ]}
              >
                {item.posicao}
              </Text>

              <View style={estilos.quem}>
                <Text style={[estilos.nome, { color: tema.tinta }]}>
                  {eu ? 'Você' : primeiroNome(item.nome)}
                </Text>

                {item.ofensiva > 0 && (
                  <Text style={[estilos.ofensiva, { color: tema.ambar }]}>
                    {item.ofensiva} {item.ofensiva === 1 ? 'dia seguido' : 'dias seguidos'}
                  </Text>
                )}
              </View>

              <Text style={[estilos.xp, { color: tema.violeta }]}>{item.xpNaSemana} XP</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

const estilos = StyleSheet.create({
  cabecalho: { paddingHorizontal: ESPACO.medio, paddingTop: ESPACO.medio },
  olho: {
    fontSize: 11,
    fontWeight: PESO.forte,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titulo: { marginTop: 2, fontSize: 26, fontWeight: PESO.maximo },
  nota: { marginTop: 6, fontSize: 13.5, fontWeight: PESO.normal, lineHeight: 19 },
  lista: { padding: ESPACO.medio, gap: ESPACO.pequeno },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.medio,
    padding: ESPACO.medio,
    borderRadius: CANTO.medio,
    borderWidth: 2,
  },
  posicao: {
    width: 34,
    height: 34,
    borderRadius: CANTO.pequeno,
    textAlign: 'center',
    lineHeight: 34,
    fontSize: 14,
    fontWeight: PESO.maximo,
    overflow: 'hidden',
  },
  quem: { flex: 1, minWidth: 0 },
  nome: { fontSize: 15, fontWeight: PESO.forte },
  ofensiva: { fontSize: 12, fontWeight: PESO.normal },
  xp: { fontSize: 14.5, fontWeight: PESO.forte },
});
