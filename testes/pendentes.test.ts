import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A fila de revisões que não subiram.
 *
 * O caso que ela resolve: o aluno estuda vinte cartas no ônibus, o envio falha
 * por falta de rede, e o trabalho dele some. Guardado só no estado da tela, ele
 * morre quando o app é fechado.
 */

/** Um sistema de arquivos de mentira, com o mesmo formato do real. */
const guardado = new Map<string, string>();

vi.mock('expo-file-system', () => ({
  Paths: { document: '/documentos' },
  File: class {
    private readonly caminho: string;

    constructor(pasta: string, nome: string) {
      this.caminho = `${pasta}/${nome}`;
    }

    get exists() {
      return guardado.has(this.caminho);
    }

    textSync() {
      return guardado.get(this.caminho) ?? '';
    }

    create() {
      guardado.set(this.caminho, '');
    }

    write(conteudo: string) {
      guardado.set(this.caminho, conteudo);
    }
  },
}));

import { diaDeEstudo } from '../src/dominio/dia-de-estudo';

const {
  contarRevisoes,
  guardarLote,
  lerPendentes,
  novoLoteId,
  removerLote,
} = await import('../src/estado/pendentes');

function lote(loteId: string, quantidade = 2) {
  return {
    loteId,
    turmaId: 't1',
    criadoEm: Date.now(),
    revisoes: Array.from({ length: quantidade }, (_, i) => ({
      cartaoId: `c${i}`,
      avaliacao: 'bom' as const,
      dia: diaDeEstudo('2026-01-15'),
    })),
  };
}

beforeEach(() => {
  guardado.clear();
});

describe('durabilidade', () => {
  it('o lote sobrevive ao fechamento do app', async () => {
    // É a razão de o lote ir para o disco ANTES da tentativa de envio.
    await guardarLote(lote('a'));

    expect(await lerPendentes()).toHaveLength(1);
  });

  it('vários lotes convivem', async () => {
    await guardarLote(lote('a'));
    await guardarLote(lote('b'));

    expect(await lerPendentes()).toHaveLength(2);
  });

  it('o mesmo lote não entra duas vezes', async () => {
    /**
     * Um reenvio guardado seria enviado duas vezes, e o servidor só protege
     * contra a duplicata dele, não da nossa.
     */
    await guardarLote(lote('igual'));
    await guardarLote(lote('igual'));

    expect(await lerPendentes()).toHaveLength(1);
  });

  it('remover tira só o lote pedido', async () => {
    await guardarLote(lote('a'));
    await guardarLote(lote('b'));

    await removerLote('a');
    const restantes = await lerPendentes();

    expect(restantes).toHaveLength(1);
    expect(restantes[0]?.loteId).toBe('b');
  });

  it('remover algo que não existe não quebra', async () => {
    await guardarLote(lote('a'));
    await removerLote('inexistente');

    expect(await lerPendentes()).toHaveLength(1);
  });
});

describe('resistência a dado ruim', () => {
  it('dado corrompido não impede o app de abrir', async () => {
    /**
     * Perder um lote é ruim; travar na inicialização é pior, e não tem saída
     * para quem usa: o app simplesmente não abre.
     */
    guardado.set('/documentos/revisoes-pendentes.json', '{isso não é json');

    expect(await lerPendentes()).toEqual([]);
  });

  it('conteúdo que não é lista também não quebra', async () => {
    guardado.set('/documentos/revisoes-pendentes.json', '{"a":1}');

    expect(await lerPendentes()).toEqual([]);
  });
});

describe('identificador de lote', () => {
  it('cada chamada gera um diferente', async () => {
    const ids = new Set(Array.from({ length: 500 }, () => novoLoteId()));
    expect(ids.size).toBe(500);
  });
});

describe('contagem para a tela', () => {
  it('soma as revisões de todos os lotes', () => {
    // Uma fila silenciosa é pior que nenhuma: a pessoa refaz tudo achando que
    // perdeu.
    expect(contarRevisoes([lote('a', 3), lote('b', 2)])).toBe(5);
  });

  it('fila vazia conta zero', () => {
    expect(contarRevisoes([])).toBe(0);
  });
});
