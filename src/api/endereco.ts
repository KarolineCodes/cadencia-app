import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * O endereço da API em desenvolvimento.
 *
 * Três ambientes, três respostas diferentes, e nenhuma delas é `localhost`:
 *
 * **Aparelho de verdade.** `localhost` aponta para o próprio celular. O que
 * funciona é o IP da máquina na rede, que o Expo informa em `hostUri`.
 *
 * **Emulador do Android.** Ele roda numa rede virtual isolada, e a máquina que
 * o hospeda atende no endereço fixo `10.0.2.2`. O IP da rede local às vezes
 * funciona e às vezes não, dependendo de como o Windows trata a interface
 * virtual, e o sintoma é uma falha de conexão intermitente que parece
 * instabilidade da API.
 *
 * **Simulador do iOS.** Compartilha a rede do computador, então `localhost`
 * funciona ali, e só ali.
 *
 * Errar isso é o problema mais comum de quem começa em React Native, e ele
 * engana porque o app carrega normalmente: o Metro serve o código pelo IP da
 * rede, e só as chamadas à API falham.
 */

const PORTA_DA_API = 3333;

/** O endereço da máquina anfitriã, visto de dentro do emulador Android. */
const ANFITRIAO_DO_EMULADOR = '10.0.2.2';

export function enderecoDaApi(): string {
  // Configuração explícita vence tudo: é assim que o app aponta para produção.
  const configurado = process.env.EXPO_PUBLIC_API_URL;
  if (configurado) return configurado;

  if (ehEmuladorAndroid()) return `http://${ANFITRIAO_DO_EMULADOR}:${PORTA_DA_API}`;

  const anfitriao = Constants.expoConfig?.hostUri?.split(':')[0];
  if (anfitriao) return `http://${anfitriao}:${PORTA_DA_API}`;

  // Simulador do iOS, ou execução na web.
  return `http://localhost:${PORTA_DA_API}`;
}

/**
 * Estamos num emulador, e não num aparelho?
 *
 * `Constants.isDevice` é falso no emulador e verdadeiro no aparelho. A checagem
 * de plataforma existe porque o simulador do iOS também é "não aparelho", e lá
 * o endereço certo é outro.
 */
export function ehEmuladorAndroid(): boolean {
  return Platform.OS === 'android' && Constants.isDevice === false;
}
