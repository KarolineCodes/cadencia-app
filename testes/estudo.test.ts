import { describe, expect, it, vi } from 'vitest';
import { buscarSessao, buscarTurmas, enviarRevisoes } from '../src/api/estudo';
import { diaDeEstudo } from '../src/dominio/dia-de-estudo';
import type { Cliente } from '../src/api/cliente';

/**
 * O contrato com o servidor.
 *
 * Estes testes existem porque eu errei os dois: chamei `/minhas-turmas`, que
 * não existe, e esperei a carta com os campos no primeiro nível, quando o
 * servidor devolve `{ cartao, agendamento }`.
 *
 * O typecheck não pega isso: uma rota é uma string, e o formato da resposta é o
 * que eu declarar que é. Só um teste que fixa o formato real do servidor
 * transforma essa suposição em algo verificável.
 */

const DIA = diaDeEstudo('2026-01-15');

function clienteFalso(resposta: unknown) {
  const chamadas: string[] = [];

  const cliente = {
    chamar: vi.fn(async (caminho: string) => {
      chamadas.push(caminho);
      return resposta;
    }),
  } as unknown as Cliente;

  return { cliente, chamadas };
}

describe('turmas', () => {
  it('chama /turmas, e não /minhas-turmas', async () => {
    // O nome errado devolve 404, e a tela mostra "algo deu errado" sem dizer o
    // que, porque o erro é do roteador e não do serviço.
    const { cliente, chamadas } = clienteFalso({ turmas: [] });

    await buscarTurmas(cliente);

    expect(chamadas[0]).toBe('/turmas');
  });

  it('devolve a lista de dentro do envelope', async () => {
    const { cliente } = clienteFalso({
      turmas: [{ id: 't1', nome: 'Inglês B1', idioma: 'ingles' }],
    });

    const turmas = await buscarTurmas(cliente);

    expect(turmas).toHaveLength(1);
    expect(turmas[0]?.nome).toBe('Inglês B1');
  });
});

describe('sessão do dia', () => {
  const respostaDoServidor = {
    cartas: [
      {
        cartao: { id: 'c1', frente: 'though', verso: 'embora', dica: 'não é "through"' },
        agendamento: {
          intervaloDias: 1,
          facilidade: 2.5,
          repeticoes: 0,
          lapsos: 0,
          venceEm: DIA,
          sinalizado: false,
        },
      },
    ],
    resumo: { total: 48, emDia: 12, sinalizadas: 2 },
    sequenciaDeDias: 6,
  };

  it('achata a carta para o formato que a tela usa', async () => {
    /**
     * O servidor devolve `{ cartao, agendamento }`. A tela trabalha com os
     * campos no primeiro nível, e a conversão acontece aqui, num lugar só.
     *
     * Espalhar isso pelos componentes faria cada tela nova repetir a tradução,
     * e errar sozinha.
     */
    const { cliente } = clienteFalso(respostaDoServidor);

    const sessao = await buscarSessao(cliente, 't1', DIA);
    const [carta] = sessao.cartas;

    expect(carta).toMatchObject({
      id: 'c1',
      frente: 'though',
      verso: 'embora',
      dica: 'não é "through"',
    });
    expect(carta?.agendamento.facilidade).toBe(2.5);
  });

  it('traz a sequência e o resumo para a tela', async () => {
    const { cliente } = clienteFalso(respostaDoServidor);
    const sessao = await buscarSessao(cliente, 't1', DIA);

    expect(sessao.sequenciaDeDias).toBe(6);
    expect(sessao.emDia).toBe(12);
    expect(sessao.total).toBe(48);
  });

  it('manda turma e dia na consulta', async () => {
    const { cliente, chamadas } = clienteFalso(respostaDoServidor);

    await buscarSessao(cliente, 'turma-1', DIA);

    expect(chamadas[0]).toBe('/estudo/sessao?turmaId=turma-1&dia=2026-01-15');
  });

  it('escapa o identificador da turma', async () => {
    // Um id com caractere especial quebraria a consulta sem isso.
    const { cliente, chamadas } = clienteFalso(respostaDoServidor);

    await buscarSessao(cliente, 'a/b c', DIA);

    expect(chamadas[0]).toContain('turmaId=a%2Fb%20c');
  });

  it('sessão vazia não quebra', async () => {
    const { cliente } = clienteFalso({
      cartas: [],
      resumo: { total: 0, emDia: 0, sinalizadas: 0 },
      sequenciaDeDias: 0,
    });

    const sessao = await buscarSessao(cliente, 't1', DIA);

    expect(sessao.cartas).toEqual([]);
  });
});

describe('envio das revisões', () => {
  it('manda o lote com o identificador', async () => {
    /**
     * O `loteId` impede que um reenvio conte duas vezes: se a resposta se
     * perder e o app tentar de novo, o servidor reconhece o mesmo lote em vez
     * de gravar tudo em dobro.
     */
    const corpos: unknown[] = [];

    const cliente = {
      chamar: vi.fn(async (_caminho: string, opcoes?: { corpo?: unknown }) => {
        corpos.push(opcoes?.corpo);
        return undefined;
      }),
    } as unknown as Cliente;

    await enviarRevisoes(cliente, 't1', 'lote-abc', [
      { cartaoId: 'c1', avaliacao: 'bom', dia: DIA },
    ]);

    expect(corpos[0]).toMatchObject({ turmaId: 't1', loteId: 'lote-abc' });
  });

  it('não manda o agendamento calculado no aparelho', async () => {
    // O cálculo local existe para a tela responder, não para substituir o
    // servidor. Mandar o resultado pronto deixaria o aluno decidir o intervalo.
    const corpos: { revisoes?: unknown[] }[] = [];

    const cliente = {
      chamar: vi.fn(async (_caminho: string, opcoes?: { corpo?: unknown }) => {
        corpos.push(opcoes?.corpo as { revisoes?: unknown[] });
        return undefined;
      }),
    } as unknown as Cliente;

    await enviarRevisoes(cliente, 't1', 'lote', [
      { cartaoId: 'c1', avaliacao: 'bom', dia: DIA },
    ]);

    expect(corpos[0]?.revisoes?.[0]).not.toHaveProperty('agendamento');
  });
});
