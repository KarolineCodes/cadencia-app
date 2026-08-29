import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buscarPontuacao, type Pontuacao } from '../../src/api/estudo';
import { Carregando, Falhou } from '../../src/componentes/Estado';
import { Ficha } from '../../src/componentes/Ficha';
import { useSessao } from '../../src/estado/sessao-provedor';
import { useTurma } from '../../src/estado/turma';
import { CANTO, ESPACO, PESO } from '../../src/tema/tema';
import { useTema } from '../../src/tema/contexto';

export default function Progresso() {
  const tema = useTema();
  const { cliente } = useSessao();
  const { turmaId, dia, erro: erroDaTurma, recarregar } = useTurma();

  const [dados, setDados] = useState<Pontuacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!turmaId || !dia) return;

    setErro(null);

    try {
      setDados(await buscarPontuacao(cliente, turmaId, dia));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para carregar.');
    }
  }, [cliente, turmaId, dia]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erroDaTurma) return <Falhou mensagem={erroDaTurma} aoTentarDeNovo={() => void recarregar()} />;
  if (erro) return <Falhou mensagem={erro} aoTentarDeNovo={() => void carregar()} />;
  if (!dados) return <Carregando texto="Buscando seu progresso…" />;

  const { ofensiva } = dados;
  const proporcao = dados.proximo === 0 ? 0 : dados.atual / dados.proximo;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tema.fundo }} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.pagina}>
        <View>
          <Text style={[estilos.olho, { color: tema.violeta }]}>Progresso</Text>
          <Text style={[estilos.titulo, { color: tema.tinta }]}>
            {ofensiva.dias === 0
              ? 'Comece hoje'
              : `${ofensiva.dias} ${ofensiva.dias === 1 ? 'dia seguido' : 'dias seguidos'}`}
          </Text>
        </View>

        {/* O aviso de risco vem antes de tudo: é a informação que faz a pessoa
            estudar hoje em vez de amanhã. */}
        {ofensiva.emRisco && (
          <View style={[estilos.alerta, { backgroundColor: tema.ambarClaro }]}>
            <Text style={[estilos.alertaTexto, { color: tema.ambar }]}>
              Sua ofensiva termina hoje se você não estudar.
            </Text>
          </View>
        )}

        <View style={estilos.fichas}>
          <Ficha valor={String(ofensiva.dias)} rotulo="dias seguidos" destaque />
          <Ficha valor={String(ofensiva.recorde)} rotulo="seu recorde" />
        </View>

        <View style={estilos.fichas}>
          <Ficha valor={`${dados.xpTotal}`} rotulo="XP total" />
          <Ficha valor={`${dados.xpHoje}`} rotulo="XP hoje" />
        </View>

        <View style={[estilos.nivel, { backgroundColor: tema.superficie, borderColor: tema.borda }]}>
          <View style={estilos.nivelTopo}>
            <Text style={[estilos.nivelRotulo, { color: tema.tintaFraca }]}>
              nível {dados.nivel}
            </Text>
            <Text style={[estilos.nivelRotulo, { color: tema.tintaFraca }]}>
              {dados.atual} / {dados.proximo} XP
            </Text>
          </View>

          <View style={[estilos.barra, { backgroundColor: tema.borda }]}>
            <View
              style={[
                estilos.barraCheia,
                { backgroundColor: tema.violeta, width: `${Math.round(proporcao * 100)}%` },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pagina: { padding: ESPACO.medio, gap: ESPACO.medio },
  olho: {
    fontSize: 11,
    fontWeight: PESO.forte,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titulo: { marginTop: 2, fontSize: 26, fontWeight: PESO.maximo },
  fichas: { flexDirection: 'row', gap: ESPACO.pequeno },
  alerta: { padding: ESPACO.medio, borderRadius: CANTO.medio },
  alertaTexto: { fontSize: 14, fontWeight: PESO.forte },
  nivel: { padding: ESPACO.medio, borderRadius: CANTO.medio, borderWidth: 2, gap: ESPACO.pequeno },
  nivelTopo: { flexDirection: 'row', justifyContent: 'space-between' },
  nivelRotulo: { fontSize: 12, fontWeight: PESO.forte },
  barra: { height: 10, borderRadius: CANTO.redondo, overflow: 'hidden' },
  barraCheia: { height: '100%', borderRadius: CANTO.redondo },
});
