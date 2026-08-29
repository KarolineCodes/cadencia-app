/**
 * As seções do app.
 *
 * Quatro, e não sete. Redação e nivelamento ficam só no portal web, e isso é
 * decisão de produto, não corte de escopo:
 *
 * > Vai para o app o que se faz com o polegar, em pé, em cinco minutos. Fica só
 * > no web o que precisa de teclado, tela grande ou concentração.
 *
 * Escrever uma redação de 150 palavras no celular é castigo, e um teste de
 * nivelamento respondido no ônibus mede distração, não nível.
 */

export interface Secao {
  chave: string;
  rotulo: string;
  /** O que a pessoa vai fazer ali, em duas ou três palavras. */
  descricao: string;
}

export const SECOES: Secao[] = [
  { chave: 'index', rotulo: 'Estudar', descricao: 'O que vence hoje' },
  { chave: 'progresso', rotulo: 'Progresso', descricao: 'Como você está indo' },
  { chave: 'ranking', rotulo: 'Ranking', descricao: 'A turma na semana' },
  { chave: 'conversa', rotulo: 'Conversar', descricao: 'Pratique falando' },
];
