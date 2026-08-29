/**
 * O cliente da API.
 *
 * A parte que exige cuidado não é fazer a chamada, é o que acontece quando o
 * token de acesso expira no meio de uma tela que dispara três pedidos ao mesmo
 * tempo.
 *
 * Sem coordenação, os três tomam 401, os três pedem renovação, e o servidor
 * recebe três tentativas com o mesmo token. Como a renovação é rotativa e
 * detecta reúso, o segundo pedido derruba a família inteira e **o aluno é
 * deslogado justamente porque abriu uma tela.**
 *
 * A saída aqui é uma fila única: o primeiro que percebe a expiração renova, e
 * os outros esperam a mesma promessa.
 */

export interface Tokens {
  acesso: string;
  renovacao: string;
}

export interface FalhaDaApi {
  status: number;
  codigo: string;
  mensagem: string;
}

export class ErroDaApi extends Error {
  readonly status: number;
  readonly codigo: string;

  constructor(falha: FalhaDaApi) {
    super(falha.mensagem);
    this.name = 'ErroDaApi';
    this.status = falha.status;
    this.codigo = falha.codigo;
  }
}

export interface OpcoesDoCliente {
  baseUrl: string;
  obterTokens: () => Promise<Tokens | null>;
  salvarTokens: (tokens: Tokens) => Promise<void>;
  aoPerderSessao: () => Promise<void>;
  buscar?: typeof fetch;
}

interface OpcoesDaChamada {
  metodo?: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  corpo?: unknown;
  /** Rota que não exige token, como entrar e cadastrar. */
  publica?: boolean;
}

export function criarCliente({
  baseUrl,
  obterTokens,
  salvarTokens,
  aoPerderSessao,
  buscar = fetch,
}: OpcoesDoCliente) {
  /**
   * A renovação em andamento.
   *
   * Enquanto ela existe, qualquer chamada que tome 401 espera por ela em vez de
   * abrir outra. É o que impede a corrida que derruba a sessão.
   */
  let renovacaoEmAndamento: Promise<Tokens | null> | null = null;

  async function enviar(caminho: string, opcoes: OpcoesDaChamada, acesso: string | null) {
    return buscar(`${baseUrl}${caminho}`, {
      method: opcoes.metodo ?? 'GET',
      headers: {
        // O tipo do conteúdo só é anunciado quando existe conteúdo: um DELETE
        // sem corpo com `application/json` é recusado antes de a rota rodar.
        ...(opcoes.corpo === undefined ? {} : { 'content-type': 'application/json' }),
        // O app recebe o token de renovação no corpo, e não em cookie: não há
        // navegador aqui para guardar cookie com segurança.
        'x-plataforma': 'mobile',
        ...(acesso ? { authorization: `Bearer ${acesso}` } : {}),
      },
      ...(opcoes.corpo === undefined ? {} : { body: JSON.stringify(opcoes.corpo) }),
    });
  }

  async function renovar(): Promise<Tokens | null> {
    if (renovacaoEmAndamento) return renovacaoEmAndamento;

    renovacaoEmAndamento = (async () => {
      const tokens = await obterTokens();
      if (!tokens) return null;

      const resposta = await buscar(`${baseUrl}/sessoes/renovar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-plataforma': 'mobile' },
        body: JSON.stringify({ renovacao: tokens.renovacao }),
      });

      if (!resposta.ok) return null;

      const dados = (await resposta.json()) as Tokens;
      await salvarTokens(dados);

      return dados;
    })();

    try {
      return await renovacaoEmAndamento;
    } finally {
      // Limpar no `finally` importa: sem isso, uma renovação que falha deixa a
      // promessa recusada guardada, e toda chamada seguinte falha com o erro
      // antigo sem nem tentar.
      renovacaoEmAndamento = null;
    }
  }

  async function chamar<T>(caminho: string, opcoes: OpcoesDaChamada = {}): Promise<T> {
    const tokens = opcoes.publica ? null : await obterTokens();
    let resposta = await enviar(caminho, opcoes, tokens?.acesso ?? null);

    if (resposta.status === 401 && !opcoes.publica) {
      const novos = await renovar();

      if (!novos) {
        await aoPerderSessao();
        throw new ErroDaApi({
          status: 401,
          codigo: 'nao_autenticado',
          mensagem: 'Sua sessão expirou. Entre de novo.',
        });
      }

      resposta = await enviar(caminho, opcoes, novos.acesso);
    }

    if (!resposta.ok) {
      const corpo = (await resposta.json().catch(() => ({}))) as Partial<FalhaDaApi>;

      throw new ErroDaApi({
        status: resposta.status,
        codigo: corpo.codigo ?? 'erro',
        mensagem: corpo.mensagem ?? 'Algo deu errado. Tente de novo.',
      });
    }

    if (resposta.status === 204) return undefined as T;

    return (await resposta.json()) as T;
  }

  return { chamar };
}

export type Cliente = ReturnType<typeof criarCliente>;
