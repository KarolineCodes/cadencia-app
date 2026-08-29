import { describe, expect, it, vi } from 'vitest';
import { ErroDaApi, criarCliente, type Tokens } from '../src/api/cliente';

const TOKENS: Tokens = { acesso: 'acesso-1', renovacao: 'renovacao-1' };

function resposta(status: number, corpo: unknown = {}) {
  return new Response(status === 204 ? null : JSON.stringify(corpo), { status });
}

function montar({ respostas }: { respostas: Response[] }) {
  const chamadas: { url: string; opcoes: RequestInit }[] = [];
  let indice = 0;
  let guardados: Tokens | null = TOKENS;
  const perdas: number[] = [];

  const buscar = (async (url: string | URL, opcoes?: RequestInit) => {
    chamadas.push({ url: String(url), opcoes: opcoes ?? {} });
    const proxima = respostas[indice];
    indice += 1;
    return proxima ?? resposta(500);
  }) as unknown as typeof fetch;

  const cliente = criarCliente({
    baseUrl: 'https://api.teste',
    obterTokens: async () => guardados,
    salvarTokens: async (novos) => {
      guardados = novos;
    },
    aoPerderSessao: async () => {
      guardados = null;
      perdas.push(Date.now());
    },
    buscar,
  });

  return { cliente, chamadas, perdas, get guardados() { return guardados; } };
}

describe('chamada comum', () => {
  it('manda o token de acesso', async () => {
    const { cliente, chamadas } = montar({ respostas: [resposta(200, { ok: true })] });

    await cliente.chamar('/eu');

    expect((chamadas[0]!.opcoes.headers as Record<string, string>).authorization).toBe(
      'Bearer acesso-1',
    );
  });

  it('anuncia a plataforma como mobile', async () => {
    // O servidor decide por aqui que o token de renovação vai no corpo, e não
    // em cookie: não há navegador para guardar cookie com segurança.
    const { cliente, chamadas } = montar({ respostas: [resposta(200)] });

    await cliente.chamar('/eu');

    expect((chamadas[0]!.opcoes.headers as Record<string, string>)['x-plataforma']).toBe(
      'mobile',
    );
  });

  it('não anuncia tipo de conteúdo quando não há corpo', async () => {
    // Um DELETE sem corpo com `application/json` é recusado pelo servidor antes
    // de a rota rodar, e o erro fala de JSON vazio.
    const { cliente, chamadas } = montar({ respostas: [resposta(204)] });

    await cliente.chamar('/sessoes', { metodo: 'DELETE' });

    expect(
      (chamadas[0]!.opcoes.headers as Record<string, string>)['content-type'],
    ).toBeUndefined();
  });

  it('rota pública vai sem token', async () => {
    const { cliente, chamadas } = montar({ respostas: [resposta(200)] });

    await cliente.chamar('/sessoes', { metodo: 'POST', corpo: {}, publica: true });

    expect(
      (chamadas[0]!.opcoes.headers as Record<string, string>).authorization,
    ).toBeUndefined();
  });

  it('204 devolve sem tentar ler JSON', async () => {
    const { cliente } = montar({ respostas: [resposta(204)] });

    await expect(cliente.chamar('/sessoes', { metodo: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('renovação', () => {
  it('renova ao tomar 401 e repete a chamada', async () => {
    const { cliente, chamadas } = montar({
      respostas: [
        resposta(401, { codigo: 'nao_autenticado', mensagem: 'expirou' }),
        resposta(200, { acesso: 'acesso-2', renovacao: 'renovacao-2' }),
        resposta(200, { usuario: { id: 'u1' } }),
      ],
    });

    const dados = await cliente.chamar<{ usuario: { id: string } }>('/eu');

    expect(dados.usuario.id).toBe('u1');
    expect(chamadas).toHaveLength(3);
    expect((chamadas[2]!.opcoes.headers as Record<string, string>).authorization).toBe(
      'Bearer acesso-2',
    );
  });

  it('três chamadas simultâneas renovam uma vez só', async () => {
    /**
     * O caso que motiva a fila única.
     *
     * Sem ela, as três tomam 401 e as três pedem renovação com o mesmo token.
     * A renovação é rotativa e detecta reúso, então a segunda derruba a família
     * inteira e o aluno é deslogado justamente por abrir uma tela.
     */
    let renovacoes = 0;
    let indice = 0;

    const buscar = (async (url: string | URL) => {
      const endereco = String(url);

      if (endereco.endsWith('/sessoes/renovar')) {
        renovacoes += 1;
        await new Promise<void>((r) => setTimeout(r, 10));
        return resposta(200, { acesso: 'novo', renovacao: 'novo' });
      }

      indice += 1;
      // As três primeiras chamadas expiram.
      return indice <= 3 ? resposta(401, { mensagem: 'expirou' }) : resposta(200, { ok: true });
    }) as unknown as typeof fetch;

    let guardados: Tokens | null = TOKENS;

    const cliente = criarCliente({
      baseUrl: 'https://api.teste',
      obterTokens: async () => guardados,
      salvarTokens: async (novos) => {
        guardados = novos;
      },
      aoPerderSessao: async () => {},
      buscar,
    });

    await Promise.all([
      cliente.chamar('/sessao'),
      cliente.chamar('/pontuacao'),
      cliente.chamar('/turmas'),
    ]);

    expect(renovacoes).toBe(1);
  });

  it('renovação recusada encerra a sessão', async () => {
    const { cliente, perdas } = montar({
      respostas: [resposta(401, { mensagem: 'expirou' }), resposta(401, { mensagem: 'não vale' })],
    });

    await expect(cliente.chamar('/eu')).rejects.toBeInstanceOf(ErroDaApi);
    expect(perdas).toHaveLength(1);
  });

  it('uma renovação que falha não trava as chamadas seguintes', async () => {
    /**
     * Sem limpar a promessa no `finally`, a recusa fica guardada e toda chamada
     * seguinte falha com o erro antigo sem nem tentar de novo. O aluno ficaria
     * preso até fechar o aplicativo.
     */
    let indice = 0;

    const buscar = (async (url: string | URL) => {
      const endereco = String(url);
      indice += 1;

      if (endereco.endsWith('/sessoes/renovar')) {
        // A primeira renovação falha, a segunda funciona.
        return indice <= 2 ? resposta(401) : resposta(200, { acesso: 'ok', renovacao: 'ok' });
      }

      return indice === 1 || indice === 3 ? resposta(401) : resposta(200, { ok: true });
    }) as unknown as typeof fetch;

    let guardados: Tokens | null = TOKENS;

    const cliente = criarCliente({
      baseUrl: 'https://api.teste',
      obterTokens: async () => guardados,
      salvarTokens: async (novos) => {
        guardados = novos;
      },
      aoPerderSessao: async () => {
        guardados = TOKENS;
      },
      buscar,
    });

    await expect(cliente.chamar('/eu')).rejects.toThrow();

    // A segunda tentativa precisa conseguir renovar de verdade.
    await expect(cliente.chamar('/eu')).resolves.toBeTruthy();
  });

  it('sem token guardado, não tenta renovar', async () => {
    let indice = 0;

    const buscar = (async () => {
      indice += 1;
      return resposta(401, { mensagem: 'sem token' });
    }) as unknown as typeof fetch;

    const cliente = criarCliente({
      baseUrl: 'https://api.teste',
      obterTokens: async () => null,
      salvarTokens: async () => {},
      aoPerderSessao: async () => {},
      buscar,
    });

    await expect(cliente.chamar('/eu')).rejects.toThrow();

    // Uma chamada e uma tentativa de renovação que devolve null sem ir à rede.
    expect(indice).toBe(1);
  });
});

describe('erros', () => {
  it('traz o código e a mensagem do servidor', async () => {
    const { cliente } = montar({
      respostas: [resposta(409, { codigo: 'conflito', mensagem: 'Já existe.' })],
    });

    await expect(cliente.chamar('/turmas', { metodo: 'POST', corpo: {} })).rejects.toMatchObject({
      status: 409,
      codigo: 'conflito',
      message: 'Já existe.',
    });
  });

  it('resposta sem JSON ainda vira erro legível', async () => {
    const buscar = (async () => new Response('<html>502</html>', { status: 502 })) as unknown as typeof fetch;

    const cliente = criarCliente({
      baseUrl: 'https://api.teste',
      obterTokens: async () => TOKENS,
      salvarTokens: async () => {},
      aoPerderSessao: async () => {},
      buscar,
    });

    await expect(cliente.chamar('/eu')).rejects.toThrow(/Algo deu errado/);
  });
});
