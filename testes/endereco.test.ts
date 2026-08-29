import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * O endereço da API em desenvolvimento.
 *
 * Três ambientes, três respostas, e nenhuma delas é `localhost`. Errar isso é o
 * problema mais comum de quem começa em React Native, e engana porque o app
 * carrega normalmente: o Metro serve o código pelo IP da rede, e só as chamadas
 * à API falham.
 */

function preparar({
  plataforma,
  ehAparelho,
  hostUri,
}: {
  plataforma: 'android' | 'ios';
  ehAparelho: boolean;
  hostUri?: string;
}) {
  vi.resetModules();

  vi.doMock('react-native', () => ({ Platform: { OS: plataforma } }));
  vi.doMock('expo-constants', () => ({
    default: {
      isDevice: ehAparelho,
      expoConfig: hostUri ? { hostUri } : {},
    },
  }));

  return import('../src/api/endereco');
}

beforeEach(() => {
  delete process.env.EXPO_PUBLIC_API_URL;
});

describe('emulador do Android', () => {
  it('usa 10.0.2.2, e não o IP da rede', async () => {
    /**
     * O emulador roda numa rede virtual isolada, e a máquina que o hospeda
     * atende nesse endereço fixo. O IP da rede local às vezes funciona e às
     * vezes não, e o sintoma é uma falha intermitente que parece instabilidade
     * da API.
     */
    const { enderecoDaApi } = await preparar({
      plataforma: 'android',
      ehAparelho: false,
      hostUri: '192.168.0.3:8081',
    });

    expect(enderecoDaApi()).toBe('http://10.0.2.2:3333');
  });

  it('é reconhecido como emulador', async () => {
    const { ehEmuladorAndroid } = await preparar({
      plataforma: 'android',
      ehAparelho: false,
    });

    expect(ehEmuladorAndroid()).toBe(true);
  });
});

describe('aparelho de verdade', () => {
  it('usa o IP da máquina que o Expo informa', async () => {
    // `localhost` no celular aponta para o próprio celular.
    const { enderecoDaApi } = await preparar({
      plataforma: 'android',
      ehAparelho: true,
      hostUri: '192.168.0.3:8081',
    });

    expect(enderecoDaApi()).toBe('http://192.168.0.3:3333');
  });

  it('não é confundido com emulador', async () => {
    const { ehEmuladorAndroid } = await preparar({
      plataforma: 'android',
      ehAparelho: true,
    });

    expect(ehEmuladorAndroid()).toBe(false);
  });
});

describe('simulador do iOS', () => {
  it('não usa o endereço do emulador Android', async () => {
    // O simulador do iOS compartilha a rede do computador: o 10.0.2.2 não
    // existe ali, e usá-lo faria toda chamada falhar.
    const { ehEmuladorAndroid } = await preparar({
      plataforma: 'ios',
      ehAparelho: false,
    });

    expect(ehEmuladorAndroid()).toBe(false);
  });
});

describe('configuração explícita', () => {
  it('a variável de ambiente vence todo o resto', async () => {
    // É assim que o app aponta para produção sem mexer em código.
    process.env.EXPO_PUBLIC_API_URL = 'https://api.cadencia.app';

    const { enderecoDaApi } = await preparar({
      plataforma: 'android',
      ehAparelho: false,
      hostUri: '192.168.0.3:8081',
    });

    expect(enderecoDaApi()).toBe('https://api.cadencia.app');
  });
});

describe('sem informação nenhuma', () => {
  it('cai para localhost em vez de quebrar', async () => {
    const { enderecoDaApi } = await preparar({ plataforma: 'ios', ehAparelho: true });

    expect(enderecoDaApi()).toBe('http://localhost:3333');
  });
});
