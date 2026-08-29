import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProvedorDeSessao } from '../src/estado/sessao-provedor';
import { ProvedorDeTurma } from '../src/estado/turma';
import { ProvedorDeTema, useTema } from '../src/tema/contexto';

/**
 * A raiz do app.
 *
 * A ordem importa: o tema envolve tudo porque até a tela de carregamento
 * precisa de cor, e o `SafeAreaProvider` vem por fora porque as medidas do
 * entalhe são consultadas em várias telas.
 */
export default function Raiz() {
  return (
    <SafeAreaProvider>
      <ProvedorDeTema>
        <Aplicacao />
      </ProvedorDeTema>
    </SafeAreaProvider>
  );
}

/**
 * Separado da raiz porque precisa ler o tema.
 *
 * Um componente não consegue usar um contexto que ele mesmo cria: o `useTema`
 * dentro de `Raiz` leria o valor padrão, não o do provedor.
 */
function Aplicacao() {
  const tema = useTema();

  return (
    /*
     * O fundo é pintado aqui, na janela inteira.
     *
     * Com `edgeToEdgeEnabled`, o app desenha por baixo da barra de status, e
     * ela fica transparente. Sem nada pintando essa área, aparece o fundo
     * padrão da janela, que é preto: os ícones escuros do sistema somem sobre
     * ele, e relógio, bateria e sinal desaparecem.
     *
     * O sintoma engana porque parece que a barra ficou preta, quando na verdade
     * ninguém pintou o que está atrás dela.
     */
    <View style={{ flex: 1, backgroundColor: tema.fundo }}>
      {/*
        `style` é a cor dos ÍCONES, não do fundo, e o nome engana: `dark`
        significa ícones escuros, para usar sobre fundo claro.
      */}
      <StatusBar style={tema.nome === 'escuro' ? 'light' : 'dark'} />

      <ProvedorDeSessao>
        {/* A turma é buscada uma vez e compartilhada: sem isso, cada aba faria
            a mesma requisição ao abrir o app. */}
        <ProvedorDeTurma>
          <Stack
            screenOptions={{
              headerShown: false,
              // A cor também vai para a tela do navegador: sem isso, a
              // transição entre rotas pisca branco no tema escuro.
              contentStyle: { backgroundColor: tema.fundo },
            }}
          />
        </ProvedorDeTurma>
      </ProvedorDeSessao>
    </View>
  );
}
