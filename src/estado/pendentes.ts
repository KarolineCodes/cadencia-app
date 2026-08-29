import { File, Paths } from 'expo-file-system';
import type { Avaliacao } from '../dominio/agendamento';
import type { DiaDeEstudo } from '../dominio/dia-de-estudo';

/**
 * As revisões que ainda não subiram.
 *
 * O caso que isto resolve: o aluno estuda vinte cartas no ônibus, o envio falha
 * por falta de rede, e o trabalho dele some. Guardado só no estado da tela, ele
 * morre quando o app é fechado, e ninguém liga o sumiço à causa.
 *
 * O lote vai para o disco **antes** da tentativa de envio, e só sai de lá
 * depois da confirmação. Se o app morrer no meio, o lote continua ali na
 * próxima abertura.
 *
 * O preço disso é a duplicata, e o `loteId` é o que resolve: o servidor
 * reconhece o mesmo lote e ignora o reenvio, em vez de gravar tudo duas vezes.
 * O identificador é gerado **uma vez**, junto com o lote, e reusado em toda
 * tentativa.
 *
 * Guardado como arquivo, e não em `SecureStore`: isto não é segredo, é o
 * histórico de estudo da própria pessoa, e o `SecureStore` tem limite de
 * tamanho pequeno demais para uma lista.
 *
 * E `expo-file-system` em vez de `AsyncStorage` por um motivo prático: o
 * `AsyncStorage` precisa de código nativo que o Expo Go não traz, e o app
 * quebra com "Native module is null" na primeira gravação. O sistema de
 * arquivos vem embutido, então tudo funciona sem compilar nada.
 *
 * `Paths.document` e não `Paths.cache`: o sistema apaga o cache quando o
 * aparelho fica sem espaço, e perder estudo por falta de espaço seria o pior
 * jeito de perder.
 */

const ARQUIVO = 'revisoes-pendentes.json';

function arquivoDaFila(): File {
  return new File(Paths.document, ARQUIVO);
}

export interface RevisaoPendente {
  cartaoId: string;
  avaliacao: Avaliacao;
  dia: DiaDeEstudo;
}

export interface LotePendente {
  loteId: string;
  turmaId: string;
  revisoes: RevisaoPendente[];
  criadoEm: number;
}

export async function lerPendentes(): Promise<LotePendente[]> {
  try {
    const arquivo = arquivoDaFila();
    if (!arquivo.exists) return [];

    const lidos = JSON.parse(arquivo.textSync()) as unknown;
    return Array.isArray(lidos) ? (lidos as LotePendente[]) : [];
  } catch {
    // Dado corrompido não pode impedir o app de abrir. Perder um lote é ruim;
    // travar na inicialização é pior, e não tem saída para quem usa.
    return [];
  }
}

export async function guardarLote(lote: LotePendente): Promise<void> {
  const atuais = await lerPendentes();

  // A mesma chave não entra duas vezes: um reenvio guardado seria enviado
  // duas vezes, e o servidor só protege contra a duplicata dele, não da nossa.
  if (atuais.some((outro) => outro.loteId === lote.loteId)) return;

  escrever([...atuais, lote]);
}

function escrever(lotes: readonly LotePendente[]): void {
  const arquivo = arquivoDaFila();

  // O arquivo é criado na primeira gravação: `create` sem isso lança quando ele
  // já existe, e a segunda sessão do dia falharia.
  if (!arquivo.exists) arquivo.create({ intermediates: true });

  arquivo.write(JSON.stringify(lotes));
}

export async function removerLote(loteId: string): Promise<void> {
  const atuais = await lerPendentes();
  escrever(atuais.filter((lote) => lote.loteId !== loteId));
}

/** Um identificador de lote, gerado uma vez e reusado em toda tentativa. */
export function novoLoteId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Quantas revisões estão esperando, para a tela avisar.
 *
 * Uma fila silenciosa é pior que nenhuma: a pessoa precisa saber que o estudo
 * está guardado, senão ela refaz tudo achando que perdeu.
 */
export function contarRevisoes(lotes: readonly LotePendente[]): number {
  return lotes.reduce((soma, lote) => soma + lote.revisoes.length, 0);
}
