import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Botao } from './Botao';
import { ESPACO, PESO } from '../tema/tema';
import { useTema } from '../tema/contexto';

/**
 * Os três estados que toda tela que busca dado tem.
 *
 * Existem como componente porque as quatro abas repetiriam o mesmo, e o
 * problema de repetir não é a duplicação: é que cada cópia acaba um pouco
 * diferente, e a tela de erro de uma esquece o botão de tentar de novo.
 */

export function Carregando({ texto }: { texto?: string }) {
  const tema = useTema();

  return (
    <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
      <ActivityIndicator color={tema.violeta} />
      {texto && <Text style={[estilos.apoio, { color: tema.tintaFraca }]}>{texto}</Text>}
    </View>
  );
}

/**
 * A tela de erro sempre tem saída.
 *
 * Sem o botão, a pessoa fica presa: recarregar o app não ajuda, porque a busca
 * falha de novo. A única saída seria fechar e reabrir, e ninguém liga isso à
 * causa.
 */
export function Falhou({
  mensagem,
  aoTentarDeNovo,
}: {
  mensagem: string;
  aoTentarDeNovo: () => void;
}) {
  const tema = useTema();

  return (
    <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
      <Text style={[estilos.titulo, { color: tema.tinta }]}>Algo deu errado</Text>
      <Text style={[estilos.apoio, { color: tema.tintaMedia }]}>{mensagem}</Text>

      <Botao titulo="Tentar de novo" aoTocar={aoTentarDeNovo} estilo={estilos.acao} />
    </View>
  );
}

/**
 * O vazio diz o que fazer, e não só que não há nada.
 *
 * "Nenhum registro" informa e para por aí, deixando a pessoa procurando onde
 * começar. O vazio é a primeira tela que todo mundo vê.
 */
export function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  const tema = useTema();

  return (
    <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
      <Text style={[estilos.titulo, { color: tema.tinta }]}>{titulo}</Text>
      <Text style={[estilos.apoio, { color: tema.tintaMedia }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: ESPACO.grande,
    gap: ESPACO.pequeno,
  },
  titulo: {
    fontSize: 22,
    fontWeight: PESO.maximo,
    textAlign: 'center',
  },
  apoio: {
    fontSize: 15,
    fontWeight: PESO.normal,
    textAlign: 'center',
    lineHeight: 22,
  },
  acao: {
    marginTop: ESPACO.pequeno,
    minWidth: 220,
  },
});
