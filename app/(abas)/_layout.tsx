import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Carregando } from '../../src/componentes/Estado';
import { useSessao } from '../../src/estado/sessao-provedor';
import { TelaEntrar } from '../../src/telas/TelaEntrar';
import { SECOES } from '../../src/config/secoes';
import { PESO } from '../../src/tema/tema';
import { useTema } from '../../src/tema/contexto';

/**
 * A navegação por abas.
 *
 * Abas na parte de baixo, e não menu em gaveta, por uma razão física: o polegar
 * alcança o rodapé sem trocar a mão de posição, e o topo de um celular grande
 * não. Numa gaveta, cada troca de seção custa dois toques em vez de um.
 *
 * Quatro seções é o limite prático: com cinco ou mais, os rótulos começam a
 * truncar e viram ícones sem palavra, que ninguém decifra de primeira.
 */
export default function Abas() {
  const tema = useTema();
  const { usuario, carregando } = useSessao();

  /*
   * A guarda fica aqui, e não dentro de uma aba.
   *
   * Dentro da aba, a barra de navegação apareceria para quem não entrou, e
   * tocar em "Ranking" mostraria a tela de login com as abas em volta. Barrar
   * no nível da navegação faz a entrada ocupar a tela inteira, como deve.
   */
  if (carregando) return <Carregando />;
  if (!usuario) return <TelaEntrar />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tema.violeta,
        tabBarInactiveTintColor: tema.tintaFraca,
        tabBarStyle: {
          backgroundColor: tema.superficie,
          borderTopColor: tema.borda,
          // Altura confortável: a área de toque precisa dos 48 pontos, e o
          // rótulo ocupa espaço abaixo do ícone.
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11.5,
          fontWeight: PESO.forte,
        },
      }}
    >
      {SECOES.map((secao) => (
        <Tabs.Screen
          key={secao.chave}
          name={secao.chave}
          options={{
            title: secao.rotulo,
            // O rótulo já é o nome; a descrição vira o anúncio do leitor de
            // tela, que assim diz o que a seção faz e não só como se chama.
            tabBarAccessibilityLabel: `${secao.rotulo}. ${secao.descricao}`,
            tabBarIcon: ({ color }) => <Icone chave={secao.chave} cor={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

/**
 * Ícones como texto.
 *
 * Sem biblioteca de ícones de propósito: são quatro símbolos, e uma dependência
 * a mais no Expo Go é uma chance a mais de quebrar por módulo nativo ausente,
 * que foi o que já aconteceu neste projeto.
 */
function Icone({ chave, cor }: { chave: string; cor: string }) {
  const simbolo =
    { index: '◆', progresso: '▲', ranking: '★', conversa: '✦' }[chave] ?? '●';

  return <Text style={{ color: cor, fontSize: 17 }}>{simbolo}</Text>;
}
