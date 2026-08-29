/**
 * O tema.
 *
 * Em React Native não há CSS nem variável que cascateia, então o tema é um
 * objeto passado adiante. Parece pior que CSS e tem uma vantagem: o TypeScript
 * confere cada uso, e uma cor que não existe vira erro de compilação em vez de
 * regra que não aplica.
 *
 * As cores são as mesmas do painel web, e isso é decisão de produto: o aluno
 * que usa os dois precisa reconhecer que é o mesmo lugar.
 */

/**
 * A forma de um tema.
 *
 * Declarada antes dos temas, e não derivada de um deles com `typeof`. Derivar
 * do claro com `as const` fixaria os valores literais no tipo, e o escuro
 * deixaria de encaixar: `'#9b8bff'` não é atribuível a `'#6b4eff'`.
 *
 * Declarar a forma também obriga um tema novo a ter todas as cores, em vez de
 * herdar buracos.
 */
export interface Tema {
  violeta: string;
  violetaEscuro: string;
  violetaClaro: string;

  coral: string;
  coralClaro: string;
  ambar: string;
  ambarClaro: string;
  azul: string;
  azulClaro: string;
  menta: string;
  mentaClaro: string;

  tinta: string;
  tintaMedia: string;
  tintaFraca: string;

  fundo: string;
  superficie: string;
  borda: string;

  /** O texto que vai sobre uma cor cheia, como dentro de um botão. */
  sobreCor: string;

  /**
   * Qual tema é este.
   *
   * Existe porque decisões fora do CSS precisam saber: a cor dos ícones da
   * barra de status, por exemplo, não é uma cor do tema, é uma escolha entre
   * claro e escuro. Comparar valores de cor para descobrir isso funciona até
   * alguém ajustar a paleta.
   */
  nome: 'claro' | 'escuro';
}

export const CLARO: Tema = {
  violeta: '#6b4eff',
  violetaEscuro: '#4c31d6',
  violetaClaro: '#efecff',

  coral: '#ff5a3c',
  coralClaro: '#ffece8',
  ambar: '#ffa41b',
  ambarClaro: '#fff4e0',
  azul: '#2f8cff',
  azulClaro: '#e6f1ff',
  menta: '#17c08a',
  mentaClaro: '#e2f8f0',

  tinta: '#1b1b32',
  tintaMedia: '#5f5f7e',
  tintaFraca: '#9a9ab5',

  fundo: '#f5f6fc',
  superficie: '#ffffff',
  borda: '#e4e4f2',

  sobreCor: '#ffffff',
  nome: 'claro',
};

/**
 * O tema escuro não é o claro invertido.
 *
 * Cor saturada sobre fundo escuro vibra e cansa, então o violeta clareia e
 * perde saturação. Um app de estudo precisa disso mais que a média: a regra do
 * dia que vira às 4h existe porque tem gente estudando de madrugada.
 */
export const ESCURO: Tema = {
  violeta: '#9b8bff',
  violetaEscuro: '#7a67e8',
  violetaClaro: '#2a2650',

  coral: '#ff7a63',
  coralClaro: '#3a2320',
  ambar: '#ffb84d',
  ambarClaro: '#3a2f1c',
  azul: '#6aa8ff',
  azulClaro: '#1f2c44',
  menta: '#3ed4a4',
  mentaClaro: '#17332b',

  tinta: '#eceaf6',
  tintaMedia: '#a8a6c2',
  tintaFraca: '#74728f',

  fundo: '#14141f',
  superficie: '#1d1d2c',
  borda: '#2c2c40',

  // Sobre cor cheia no tema escuro, texto preto lê melhor que branco: as cores
  // aqui são claras.
  sobreCor: '#14141f',
  nome: 'escuro',
};

export const ESPACO = {
  minusculo: 4,
  pequeno: 8,
  medio: 16,
  grande: 24,
  enorme: 32,
} as const;

export const CANTO = {
  pequeno: 10,
  medio: 16,
  grande: 22,
  redondo: 999,
} as const;

/**
 * Os pesos de fonte que o app usa.
 *
 * Três, e não seis. Cada nível a mais é uma decisão que alguém vai tomar
 * diferente, e escala pequena é escala que se respeita.
 */
export const PESO = {
  normal: '600',
  forte: '800',
  maximo: '900',
} as const;
