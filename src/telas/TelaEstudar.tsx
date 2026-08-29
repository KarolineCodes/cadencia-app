import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Avaliacao } from '../dominio/agendamento';
import {
  acabou,
  avaliar,
  cartaAtual,
  iniciarSessao,
  paraEnvio,
  progresso,
  restantes,
  revelar,
  xpDaSessao,
  type Carta,
  type EstadoDaSessao,
} from '../estado/sessao';
import type { DiaDeEstudo } from '../dominio/dia-de-estudo';
import { Botao } from '../componentes/Botao';
import { Ficha } from '../componentes/Ficha';
import { CANTO, ESPACO, PESO } from '../tema/tema';
import { useTema } from '../tema/contexto';

/**
 * A tela de estudo.
 *
 * O componente só desenha e chama as funções puras de `estado/sessao`. É o que
 * permite testar toda a lógica de percurso, repetição e pontuação sem montar
 * componente nem simular toque.
 */

const AVALIACOES: { valor: Avaliacao; titulo: string }[] = [
  { valor: 'errei', titulo: 'Errei' },
  { valor: 'dificil', titulo: 'Difícil' },
  { valor: 'bom', titulo: 'Bom' },
  { valor: 'facil', titulo: 'Fácil' },
];

export function TelaEstudar({
  cartas,
  dia,
  aoTerminar,
  enviando = false,
}: {
  cartas: readonly Carta[];
  dia: DiaDeEstudo;
  aoTerminar: (revisoes: ReturnType<typeof paraEnvio>) => void;
  enviando?: boolean;
}) {
  const tema = useTema();
  const [estado, setEstado] = useState<EstadoDaSessao>(() => iniciarSessao(cartas, dia));

  const carta = cartaAtual(estado);
  const { feitas, total } = progresso(estado);

  const responder = useCallback(
    (avaliacao: Avaliacao) => {
      setEstado((atual) => {
        const proximo = avaliar(atual, avaliacao);

        // O envio acontece quando a sessão acaba, e não a cada carta: quem
        // avalia trinta em três minutos faria trinta chamadas de rede.
        if (acabou(proximo)) aoTerminar(paraEnvio(proximo));

        return proximo;
      });
    },
    [aoTerminar],
  );

  if (acabou(estado)) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <Text style={[estilos.titulo, { color: tema.tinta }]}>
          {total === 0 ? 'Nada para revisar hoje' : 'Sessão concluída'}
        </Text>

        {total > 0 && (
          <>
            <Text style={[estilos.apoio, { color: tema.tintaMedia }]}>
              {total} {total === 1 ? 'palavra revisada' : 'palavras revisadas'}, mais{' '}
              {xpDaSessao(estado)} XP.
            </Text>

            {enviando && (
              <Text style={[estilos.aviso, { color: tema.tintaFraca }]}>
                Guardando seu progresso…
              </Text>
            )}
          </>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: tema.fundo }}
      contentContainerStyle={estilos.pagina}
    >
      <View style={estilos.fichas}>
        <Ficha valor={`${feitas} de ${total}`} rotulo="revisadas" destaque />
        <Ficha valor={String(restantes(estado))} rotulo="faltam" />
      </View>

      {/* A barra de progresso é decorativa: o número já está na ficha, e
          repetir faria o leitor de tela anunciar duas vezes. */}
      <View
        style={[estilos.barra, { backgroundColor: tema.borda }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <View
          style={[
            estilos.barraCheia,
            {
              backgroundColor: tema.violeta,
              width: total === 0 ? '0%' : `${Math.round((feitas / total) * 100)}%`,
            },
          ]}
        />
      </View>

      <View
        style={[
          estilos.carta,
          { backgroundColor: tema.superficie, borderColor: tema.borda },
        ]}
      >
        <Text style={[estilos.frente, { color: tema.tinta }]}>{carta?.frente}</Text>

        {estado.revelada && (
          <>
            <View style={[estilos.risco, { backgroundColor: tema.borda }]} />
            <Text style={[estilos.verso, { color: tema.violeta }]}>{carta?.verso}</Text>

            {carta?.dica && (
              <Text style={[estilos.dica, { color: tema.tintaFraca }]}>{carta.dica}</Text>
            )}
          </>
        )}
      </View>

      {estado.revelada ? (
        <View style={estilos.avaliacoes}>
          {AVALIACOES.map((opcao) => (
            <Botao
              key={opcao.valor}
              titulo={opcao.titulo}
              aparencia={opcao.valor}
              aoTocar={() => responder(opcao.valor)}
              estilo={estilos.avaliacao}
            />
          ))}
        </View>
      ) : (
        <Botao titulo="Mostrar" aoTocar={() => setEstado(revelar)} />
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pagina: {
    padding: ESPACO.medio,
    gap: ESPACO.medio,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: ESPACO.grande,
    gap: ESPACO.pequeno,
  },
  fichas: {
    flexDirection: 'row',
    gap: ESPACO.pequeno,
  },
  barra: {
    height: 8,
    borderRadius: CANTO.redondo,
    overflow: 'hidden',
  },
  barraCheia: {
    height: '100%',
    borderRadius: CANTO.redondo,
  },
  carta: {
    minHeight: 220,
    padding: ESPACO.grande,
    borderRadius: CANTO.grande,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACO.medio,
  },
  frente: {
    fontSize: 30,
    fontWeight: PESO.maximo,
    textAlign: 'center',
  },
  risco: {
    width: 48,
    height: 2,
    borderRadius: 1,
  },
  verso: {
    fontSize: 20,
    fontWeight: PESO.forte,
    textAlign: 'center',
  },
  dica: {
    fontSize: 14,
    fontWeight: PESO.normal,
    textAlign: 'center',
  },
  avaliacoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ESPACO.pequeno,
  },
  avaliacao: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  titulo: {
    fontSize: 24,
    fontWeight: PESO.maximo,
    textAlign: 'center',
  },
  apoio: {
    fontSize: 15,
    fontWeight: PESO.normal,
    textAlign: 'center',
  },
  aviso: {
    fontSize: 13,
    fontWeight: PESO.normal,
  },
});
