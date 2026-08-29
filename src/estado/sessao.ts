import type { Agendamento, Avaliacao } from '../dominio/agendamento';
import { agendar } from '../dominio/agendamento';
import type { DiaDeEstudo } from '../dominio/dia-de-estudo';
import { xpDoDia } from '../dominio/pontuacao';

/**
 * A sessão de estudo.
 *
 * Função pura, sem rede e sem React. É ela que decide o que aparece na tela,
 * e por isso pode ser testada sem montar componente nem simular toque.
 *
 * A decisão que organiza tudo: **o agendamento é calculado aqui, no aparelho**,
 * pelo mesmo módulo que o servidor usa. A tela responde no toque, porque quem
 * avalia trinta cartas em três minutos não pode esperar a rede a cada uma.
 *
 * O envio acontece em lote, depois. Se a rede falhar, as avaliações continuam
 * guardadas e sobem na próxima abertura, e o `loteId` impede que um reenvio
 * conte duas vezes.
 */

export interface Carta {
  id: string;
  frente: string;
  verso: string;
  dica: string | null;
  agendamento: Agendamento;
}

export interface RevisaoFeita {
  cartaoId: string;
  avaliacao: Avaliacao;
  dia: DiaDeEstudo;
  /** O agendamento antes da revisão, que é o que decide o XP. */
  agendamentoAnterior: Agendamento;
}

export interface EstadoDaSessao {
  cartas: Carta[];
  posicao: number;
  revelada: boolean;
  feitas: RevisaoFeita[];
  dia: DiaDeEstudo;
}

export function iniciarSessao(cartas: readonly Carta[], dia: DiaDeEstudo): EstadoDaSessao {
  return { cartas: [...cartas], posicao: 0, revelada: false, feitas: [], dia };
}

export function cartaAtual(estado: EstadoDaSessao): Carta | null {
  return estado.cartas[estado.posicao] ?? null;
}

export function acabou(estado: EstadoDaSessao): boolean {
  return estado.posicao >= estado.cartas.length;
}

export function revelar(estado: EstadoDaSessao): EstadoDaSessao {
  return { ...estado, revelada: true };
}

/**
 * Avalia a carta atual e vai para a próxima.
 *
 * A carta errada **volta para o fim da fila**, e não some. Numa sessão de vinte
 * cartas, sair da tela ao errar significa que o aluno vê a palavra difícil uma
 * vez só, e é justamente a que ele precisa ver de novo.
 *
 * Mas só volta se ainda não tiver voltado: repetir sem limite transformaria uma
 * carta travada num laço que não termina, e a sessão nunca acabaria.
 */
export function avaliar(estado: EstadoDaSessao, avaliacao: Avaliacao): EstadoDaSessao {
  const carta = cartaAtual(estado);
  if (!carta) return estado;

  const anterior = carta.agendamento;
  const novo = agendar(anterior, avaliacao, estado.dia);

  const feita: RevisaoFeita = {
    cartaoId: carta.id,
    avaliacao,
    dia: estado.dia,
    agendamentoAnterior: anterior,
  };

  const jaVoltou = estado.feitas.some((outra) => outra.cartaoId === carta.id);
  const deveVoltar = avaliacao === 'errei' && !jaVoltou;

  const cartas = deveVoltar
    ? [...estado.cartas, { ...carta, agendamento: novo }]
    : estado.cartas;

  return {
    ...estado,
    cartas,
    posicao: estado.posicao + 1,
    revelada: false,
    feitas: [...estado.feitas, feita],
  };
}

/** Quantas cartas ainda faltam, contando as que voltaram para a fila. */
export function restantes(estado: EstadoDaSessao): number {
  return Math.max(0, estado.cartas.length - estado.posicao);
}

/**
 * O progresso, para a barra da tela.
 *
 * Conta cartas **distintas** já avaliadas, e não avaliações feitas. Com a
 * repetição da carta errada, contar avaliações faria a barra andar para trás
 * quando alguém erra, o que parece defeito.
 */
export function progresso(estado: EstadoDaSessao): { feitas: number; total: number } {
  const distintas = new Set(estado.feitas.map((feita) => feita.cartaoId));
  const total = new Set(estado.cartas.map((carta) => carta.id));

  return { feitas: distintas.size, total: total.size };
}

/** O XP ganho na sessão, pela mesma regra do servidor. */
export function xpDaSessao(estado: EstadoDaSessao, jaGanhoHoje = 0): number {
  return xpDoDia(
    estado.feitas.map((feita) => ({
      avaliacao: feita.avaliacao,
      agendamentoAnterior: feita.agendamentoAnterior,
    })),
    estado.dia,
    jaGanhoHoje,
  );
}

/**
 * O que sobe para o servidor.
 *
 * Só a avaliação e o dia: o agendamento calculado aqui **não é enviado**. O
 * servidor recalcula com o mesmo módulo, e a resposta dele é a autoridade.
 *
 * Mandar o agendamento pronto seria mais rápido e deixaria o aluno decidir o
 * próprio intervalo pelo console. O cálculo local existe para a tela responder,
 * não para substituir o servidor.
 */
export function paraEnvio(estado: EstadoDaSessao) {
  return estado.feitas.map((feita) => ({
    cartaoId: feita.cartaoId,
    avaliacao: feita.avaliacao,
    dia: feita.dia,
  }));
}
