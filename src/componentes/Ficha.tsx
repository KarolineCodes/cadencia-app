import { StyleSheet, Text, View } from 'react-native';
import { CANTO, ESPACO, PESO } from '../tema/tema';
import { useTema } from '../tema/contexto';

/**
 * Número grande com rótulo pequeno.
 *
 * O número vem primeiro na ordem de leitura porque é o que a pessoa procura.
 * `accessibilityLabel` junta os dois numa frase, senão o leitor de tela anuncia
 * "seis" e depois "dias seguidos" como se fossem informações separadas.
 */
export function Ficha({
  valor,
  rotulo,
  destaque = false,
}: {
  valor: string;
  rotulo: string;
  destaque?: boolean;
}) {
  const tema = useTema();

  return (
    <View
      accessible
      accessibilityLabel={`${valor} ${rotulo}`}
      style={[
        estilos.base,
        {
          backgroundColor: destaque ? tema.violetaClaro : tema.superficie,
          borderColor: destaque ? tema.violeta : tema.borda,
        },
      ]}
    >
      <Text
        style={[estilos.valor, { color: destaque ? tema.violeta : tema.tinta }]}
        // O leitor de tela já anuncia a frase inteira pelo rótulo do cartão.
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {valor}
      </Text>

      <Text
        style={[estilos.rotulo, { color: tema.tintaFraca }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {rotulo}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    flex: 1,
    minWidth: 100,
    padding: ESPACO.medio,
    borderRadius: CANTO.medio,
    borderWidth: 2,
  },
  valor: {
    fontSize: 22,
    fontWeight: PESO.maximo,
  },
  rotulo: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: PESO.normal,
  },
});
