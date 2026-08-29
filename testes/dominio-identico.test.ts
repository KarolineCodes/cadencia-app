import { describe, expect, it } from 'vitest';
import {
  FACILIDADE_INICIAL,
  FACILIDADE_MAXIMA,
  FACILIDADE_MINIMA,
  LAPSOS_PARA_SINALIZAR,
  TETO_INTERVALO_DIAS,
  agendamentoNovo,
  agendar,
} from '../src/dominio/agendamento';
import { HORA_DE_VIRADA, diaDeEstudo, diaDeEstudoDe } from '../src/dominio/dia-de-estudo';
import { TETO_DIARIO_DE_XP, xpDaRevisao } from '../src/dominio/pontuacao';

/**
 * A trava contra divergência.
 *
 * O domínio deste app é uma **cópia** do que roda no servidor do Cadência. A
 * fonte única seria melhor, e não funciona bem aqui: o Metro, empacotador do
 * React Native, não lida bem com pacote entregue como fonte TypeScript sem
 * compilação, e resolver isso exigiria um passo de build e versionamento no
 * outro repositório.
 *
 * A escolha foi copiar. O risco dessa escolha é conhecido: alguém muda a regra
 * de um lado e não do outro, e a partir daí o app calcula um intervalo e o
 * servidor grava outro. O aluno vê uma data na tela e recebe outra na próxima
 * abertura, e ninguém liga o defeito à causa.
 *
 * Este arquivo transforma esse risco em falha visível. Os valores abaixo foram
 * extraídos da execução do domínio no servidor, e estão escritos à mão de
 * propósito: se eles fossem calculados pelo próprio código, o teste passaria
 * mesmo depois de a regra mudar, que é exatamente o que ele existe para
 * impedir.
 *
 * **Quando este teste falhar, a pergunta não é "como faço passar".** É se a
 * mudança foi feita nos dois lados.
 */

describe('as constantes são as mesmas dos dois lados', () => {
  /**
   * Estes números vieram de `packages/dominio/src/agendamento.ts` no Cadência.
   * Mudá-los aqui sem mudar lá faz o app prometer uma coisa e o servidor
   * gravar outra.
   */
  it('o teto de intervalo é 120 dias', () => {
    expect(TETO_INTERVALO_DIAS).toBe(120);
  });

  it('a facilidade vai de 1.6 a 2.8, começando em 2.5', () => {
    expect(FACILIDADE_MINIMA).toBe(1.6);
    expect(FACILIDADE_MAXIMA).toBe(2.8);
    expect(FACILIDADE_INICIAL).toBe(2.5);
  });

  it('a carta é sinalizada no quarto erro', () => {
    expect(LAPSOS_PARA_SINALIZAR).toBe(4);
  });

  it('o dia vira às 4 da manhã', () => {
    expect(HORA_DE_VIRADA).toBe(4);
  });

  it('o teto diário de XP é 200', () => {
    expect(TETO_DIARIO_DE_XP).toBe(200);
  });
});

describe('a sequência de intervalos é idêntica à do servidor', () => {
  const HOJE = diaDeEstudo('2026-01-01');

  /**
   * A prova mais forte de que as duas cópias concordam: percorrer a mesma
   * sequência de avaliações e comparar cada intervalo produzido.
   *
   * Um erro em qualquer ponto da fórmula aparece aqui, mesmo que as constantes
   * estejam certas.
   */
  it('quem sempre acerta segue 1, 3, 8, 20, 50, 120', () => {
    let agendamento = agendamentoNovo(HOJE);
    const intervalos: number[] = [];

    for (let volta = 0; volta < 6; volta += 1) {
      agendamento = agendar(agendamento, 'bom', agendamento.venceEm);
      intervalos.push(agendamento.intervaloDias);
    }

    expect(intervalos).toEqual([1, 3, 8, 20, 50, 120]);
  });

  it('quem acha difícil avança mais devagar', () => {
    let agendamento = agendamentoNovo(HOJE);
    const intervalos: number[] = [];

    for (let volta = 0; volta < 7; volta += 1) {
      agendamento = agendar(agendamento, 'dificil', agendamento.venceEm);
      intervalos.push(agendamento.intervaloDias);
    }

    expect(intervalos).toEqual([1, 3, 6, 11, 19, 30, 48]);
  });

  it('errar volta para um dia e conta o lapso', () => {
    let agendamento = agendamentoNovo(HOJE);

    for (let volta = 0; volta < 3; volta += 1) {
      agendamento = agendar(agendamento, 'bom', agendamento.venceEm);
    }

    const depoisDoErro = agendar(agendamento, 'errei', agendamento.venceEm);

    expect(depoisDoErro.intervaloDias).toBe(1);
    expect(depoisDoErro.lapsos).toBe(1);
    expect(depoisDoErro.repeticoes).toBe(0);
  });

  it('o quarto erro sinaliza a carta para o professor', () => {
    let agendamento = agendamentoNovo(HOJE);

    for (let volta = 0; volta < 4; volta += 1) {
      agendamento = agendar(agendamento, 'errei', agendamento.venceEm);
    }

    expect(agendamento.sinalizado).toBe(true);
  });

  it('o intervalo nunca passa do teto, por mais que se acerte', () => {
    let agendamento = agendamentoNovo(HOJE);

    for (let volta = 0; volta < 30; volta += 1) {
      agendamento = agendar(agendamento, 'facil', agendamento.venceEm);
    }

    expect(agendamento.intervaloDias).toBe(TETO_INTERVALO_DIAS);
  });
});

describe('o dia de estudo é calculado igual', () => {
  /**
   * A regra que mais depende de coincidência entre os dois lados: se o app
   * achar que já é amanhã e o servidor achar que ainda é hoje, a sessão do
   * aluno vem vazia sem explicação.
   */
  it('uma da manhã ainda é o dia anterior', () => {
    const madrugada = new Date('2026-03-11T04:00:00Z'); // 1h no Brasil
    expect(diaDeEstudoDe(madrugada, 'America/Sao_Paulo')).toBe('2026-03-10');
  });

  it('cinco da manhã já é o dia novo', () => {
    const manha = new Date('2026-03-11T08:00:00Z'); // 5h no Brasil
    expect(diaDeEstudoDe(manha, 'America/Sao_Paulo')).toBe('2026-03-11');
  });

  it('o fuso do aluno é respeitado, e não o do aparelho', () => {
    const instante = new Date('2026-03-11T04:00:00Z');

    expect(diaDeEstudoDe(instante, 'America/Sao_Paulo')).toBe('2026-03-10');
    expect(diaDeEstudoDe(instante, 'Europe/Lisbon')).toBe('2026-03-11');
  });
});

describe('a pontuação segue a mesma regra', () => {
  const HOJE = diaDeEstudo('2026-01-01');

  it('carta vencida acertada rende ponto', () => {
    const xp = xpDaRevisao(
      { avaliacao: 'bom', agendamentoAnterior: { ...agendamentoNovo(HOJE), venceEm: HOJE } },
      HOJE,
    );

    expect(xp).toBe(10);
  });

  it('carta que ainda não venceu não rende nada', () => {
    const xp = xpDaRevisao(
      {
        avaliacao: 'facil',
        agendamentoAnterior: {
          ...agendamentoNovo(HOJE),
          venceEm: diaDeEstudo('2026-02-01'),
        },
      },
      HOJE,
    );

    expect(xp).toBe(0);
  });

  it('recuperar carta esquecida rende mais', () => {
    const xp = xpDaRevisao(
      {
        avaliacao: 'bom',
        agendamentoAnterior: { ...agendamentoNovo(HOJE), venceEm: HOJE, lapsos: 2 },
      },
      HOJE,
    );

    expect(xp).toBe(15);
  });
});
