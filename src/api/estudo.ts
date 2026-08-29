import type { Agendamento, Avaliacao } from '../dominio/agendamento';
import type { DiaDeEstudo } from '../dominio/dia-de-estudo';
import type { Carta } from '../estado/sessao';
import type { Cliente } from './cliente';

/**
 * As chamadas de estudo.
 *
 * Existe para a conversão do formato do servidor acontecer **num lugar só**. A
 * API devolve cada carta como `{ cartao, agendamento }`, e a tela trabalha com
 * os campos no primeiro nível. Espalhar essa conversão pelos componentes faria
 * cada tela nova repetir a mesma tradução, e errar sozinha.
 */

interface TurmaDoServidor {
  id: string;
  nome: string;
  idioma: string;
}

interface CartaDoServidor {
  cartao: { id: string; frente: string; verso: string; dica: string | null };
  agendamento: Agendamento;
}

interface SessaoDoServidor {
  cartas: CartaDoServidor[];
  resumo: { total: number; emDia: number; sinalizadas: number };
  sequenciaDeDias: number;
}

export interface SessaoDoDia {
  cartas: Carta[];
  sequenciaDeDias: number;
  emDia: number;
  total: number;
}

export async function buscarTurmas(cliente: Cliente): Promise<TurmaDoServidor[]> {
  const dados = await cliente.chamar<{ turmas: TurmaDoServidor[] }>('/turmas');
  return dados.turmas;
}

export async function buscarSessao(
  cliente: Cliente,
  turmaId: string,
  dia: DiaDeEstudo,
): Promise<SessaoDoDia> {
  const dados = await cliente.chamar<SessaoDoServidor>(
    `/estudo/sessao?turmaId=${encodeURIComponent(turmaId)}&dia=${dia}`,
  );

  return {
    cartas: dados.cartas.map((carta) => ({
      id: carta.cartao.id,
      frente: carta.cartao.frente,
      verso: carta.cartao.verso,
      dica: carta.cartao.dica,
      agendamento: carta.agendamento,
    })),
    sequenciaDeDias: dados.sequenciaDeDias,
    emDia: dados.resumo.emDia,
    total: dados.resumo.total,
  };
}

/**
 * Envia as revisões da sessão.
 *
 * O `loteId` é gerado por sessão e impede que um reenvio conte duas vezes: se a
 * resposta se perder e o app tentar de novo, o servidor reconhece o mesmo lote
 * em vez de gravar tudo em dobro.
 */
export async function enviarRevisoes(
  cliente: Cliente,
  turmaId: string,
  loteId: string,
  revisoes: readonly { cartaoId: string; avaliacao: Avaliacao; dia: DiaDeEstudo }[],
): Promise<void> {
  await cliente.chamar('/estudo/revisoes', {
    metodo: 'POST',
    corpo: { turmaId, loteId, revisoes },
  });
}

/** ------------------------------------------------------- pontuação */

export interface Pontuacao {
  xpTotal: number;
  xpHoje: number;
  nivel: number;
  atual: number;
  proximo: number;
  ofensiva: { dias: number; emRisco: boolean; recorde: number };
}

export interface LinhaDoRanking {
  alunoId: string;
  nome: string;
  xpNaSemana: number;
  ofensiva: number;
  posicao: number;
  empatado: boolean;
}

export async function buscarPontuacao(
  cliente: Cliente,
  turmaId: string,
  dia: DiaDeEstudo,
): Promise<Pontuacao> {
  return cliente.chamar<Pontuacao>(
    `/pontuacao?turmaId=${encodeURIComponent(turmaId)}&dia=${dia}`,
  );
}

export async function buscarRanking(
  cliente: Cliente,
  turmaId: string,
  dia: DiaDeEstudo,
): Promise<{ desde: string; ranking: LinhaDoRanking[] }> {
  return cliente.chamar(
    `/pontuacao/ranking?turmaId=${encodeURIComponent(turmaId)}&dia=${dia}`,
  );
}

/** -------------------------------------------------------- conversa */

export interface ConversaResumida {
  id: string;
  cenario: string;
  nivel: string;
  falas: number;
  encerrada: boolean;
}

export interface FalaDaConversa {
  autor: 'aluno' | 'assistente';
  texto: string;
  correcoes: { trecho: string; sugestao: string }[];
}

export interface Conversa {
  id: string;
  cenario: string;
  nivel: string;
  falas: FalaDaConversa[];
  restantes: number;
}

export async function buscarConversas(
  cliente: Cliente,
  turmaId: string,
): Promise<ConversaResumida[]> {
  const dados = await cliente.chamar<{ conversas: ConversaResumida[] }>(
    `/conversas?turmaId=${encodeURIComponent(turmaId)}`,
  );

  return dados.conversas;
}

export async function comecarConversa(
  cliente: Cliente,
  turmaId: string,
  cenario: string,
  nivel: string,
): Promise<Conversa> {
  return cliente.chamar<Conversa>('/conversas', {
    metodo: 'POST',
    corpo: { turmaId, cenario, nivel },
  });
}

export async function buscarConversa(
  cliente: Cliente,
  conversaId: string,
): Promise<Conversa> {
  return cliente.chamar<Conversa>(`/conversas/${conversaId}`);
}

export async function falar(
  cliente: Cliente,
  conversaId: string,
  mensagem: string,
): Promise<{ resposta: string; correcoes: { trecho: string; sugestao: string }[]; restantes: number }> {
  return cliente.chamar(`/conversas/${conversaId}/falas`, {
    metodo: 'POST',
    corpo: { mensagem },
  });
}
