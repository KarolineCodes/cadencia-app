import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao } from '../componentes/Botao';
import { useSessao } from '../estado/sessao-provedor';
import { CANTO, ESPACO, PESO } from '../tema/tema';
import { useTema } from '../tema/contexto';

/**
 * A entrada.
 *
 * `KeyboardAvoidingView` existe porque o teclado do celular cobre metade da
 * tela: sem ele, o campo de senha some atrás do teclado e a pessoa digita às
 * cegas. O comportamento difere entre os sistemas, e por isso a plataforma é
 * consultada.
 */
export function TelaEntrar() {
  const tema = useTema();
  const { entrar } = useSessao();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setErro(null);
    setEnviando(true);

    try {
      await entrar(email.trim(), senha);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para entrar agora.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={[estilos.tela, { backgroundColor: tema.fundo }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={estilos.corpo}
      >
        <Text style={[estilos.marca, { color: tema.violeta }]}>Cadência</Text>
        <Text style={[estilos.apoio, { color: tema.tintaMedia }]}>
          Entre para ver o que vence hoje
        </Text>

        <View style={estilos.campos}>
          <View>
            <Text style={[estilos.rotulo, { color: tema.tintaFraca }]}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              accessibilityLabel="E-mail"
              style={[
                estilos.entrada,
                { color: tema.tinta, backgroundColor: tema.superficie, borderColor: tema.borda },
              ]}
            />
          </View>

          <View>
            <Text style={[estilos.rotulo, { color: tema.tintaFraca }]}>Senha</Text>
            <TextInput
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              autoComplete="current-password"
              accessibilityLabel="Senha"
              style={[
                estilos.entrada,
                { color: tema.tinta, backgroundColor: tema.superficie, borderColor: tema.borda },
              ]}
            />
          </View>
        </View>

        {erro && (
          <Text style={[estilos.erro, { color: tema.coral }]} accessibilityRole="alert">
            {erro}
          </Text>
        )}

        <Botao
          titulo={enviando ? 'Entrando…' : 'Entrar'}
          aoTocar={() => void confirmar()}
          desabilitado={enviando || email.trim() === '' || senha === ''}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  corpo: {
    flex: 1,
    justifyContent: 'center',
    padding: ESPACO.grande,
    gap: ESPACO.medio,
  },
  marca: {
    fontSize: 34,
    fontWeight: PESO.maximo,
    letterSpacing: -1,
  },
  apoio: {
    fontSize: 15,
    fontWeight: PESO.normal,
  },
  campos: {
    gap: ESPACO.medio,
    marginTop: ESPACO.pequeno,
  },
  rotulo: {
    fontSize: 11,
    fontWeight: PESO.forte,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  entrada: {
    minHeight: 48,
    paddingHorizontal: ESPACO.medio,
    fontSize: 16,
    fontWeight: PESO.normal,
    borderWidth: 2,
    borderRadius: CANTO.medio,
  },
  erro: {
    fontSize: 14,
    fontWeight: PESO.forte,
  },
});
