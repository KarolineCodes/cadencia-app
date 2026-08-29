import * as SecureStore from 'expo-secure-store';
import type { Tokens } from './cliente';

/**
 * Onde os tokens ficam guardados.
 *
 * `SecureStore` usa o Keychain no iOS e o Keystore no Android, que são
 * armazenamentos cifrados pelo próprio sistema. `AsyncStorage` seria mais
 * simples e guarda em texto claro num arquivo do aplicativo: num aparelho com
 * acesso root, qualquer processo lê.
 *
 * A diferença importa porque o token de renovação vale trinta dias. Um acesso
 * roubado expira em minutos; uma renovação roubada é um mês de acesso.
 */

const CHAVE_ACESSO = 'cadencia.acesso';
const CHAVE_RENOVACAO = 'cadencia.renovacao';

export async function lerTokens(): Promise<Tokens | null> {
  const [acesso, renovacao] = await Promise.all([
    SecureStore.getItemAsync(CHAVE_ACESSO),
    SecureStore.getItemAsync(CHAVE_RENOVACAO),
  ]);

  // Os dois ou nenhum: um par pela metade não serve para nada, e tratá-lo como
  // sessão válida faria toda chamada falhar sem explicação.
  if (!acesso || !renovacao) return null;

  return { acesso, renovacao };
}

export async function guardarTokens(tokens: Tokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(CHAVE_ACESSO, tokens.acesso),
    SecureStore.setItemAsync(CHAVE_RENOVACAO, tokens.renovacao),
  ]);
}

export async function apagarTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(CHAVE_ACESSO),
    SecureStore.deleteItemAsync(CHAVE_RENOVACAO),
  ]);
}
