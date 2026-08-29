import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { CANTO, ESPACO, PESO } from '../tema/tema';
import { useTema } from '../tema/contexto';

type Aparencia = 'principal' | 'secundario' | 'errei' | 'dificil' | 'bom' | 'facil';

/**
 * O botão.
 *
 * Duas decisões que valem em qualquer app e valem mais neste.
 *
 * **Área de toque de 48 pontos.** É a recomendação da WCAG e do Material, e o
 * motivo é físico: a ponta do dedo cobre mais que o ícone. Botão menor é
 * acertado por sorte, e a pessoa culpa a própria mão.
 *
 * **A resposta é imediata e visual.** Numa sessão de estudo o aluno aperta
 * trinta vezes seguidas; sem retorno instantâneo, ele aperta de novo achando
 * que não pegou.
 */
export function Botao({
  titulo,
  aoTocar,
  aparencia = 'principal',
  desabilitado = false,
  estilo,
}: {
  titulo: string;
  aoTocar: () => void;
  aparencia?: Aparencia;
  desabilitado?: boolean;
  estilo?: ViewStyle;
}) {
  const tema = useTema();

  const fundo = {
    principal: tema.violeta,
    secundario: tema.superficie,
    errei: tema.coral,
    dificil: tema.ambar,
    bom: tema.azul,
    facil: tema.menta,
  }[aparencia];

  const cor = aparencia === 'secundario' ? tema.tinta : tema.sobreCor;

  return (
    <Pressable
      onPress={aoTocar}
      disabled={desabilitado}
      // O papel e o estado vão para o leitor de tela: sem eles, o TalkBack
      // anuncia só o texto, sem dizer que é tocável nem que está desativado.
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: desabilitado }}
      style={({ pressed }) => [
        estilos.base,
        {
          backgroundColor: fundo,
          borderColor: aparencia === 'secundario' ? tema.borda : 'transparent',
          opacity: desabilitado ? 0.45 : 1,
          // O afundamento é a resposta imediata ao toque.
          transform: [{ translateY: pressed && !desabilitado ? 2 : 0 }],
        },
        estilo,
      ]}
    >
      <Text style={[estilos.texto, { color: cor }]}>{titulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: ESPACO.medio,
    paddingVertical: ESPACO.pequeno + 4,
    borderRadius: CANTO.medio,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontSize: 15,
    fontWeight: PESO.forte,
  },
});
