import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { CLARO, ESCURO, type Tema } from './tema';

/**
 * O tema disponível em qualquer tela.
 *
 * Segue a preferência do sistema por padrão. Quem já configurou o aparelho não
 * deveria configurar de novo, e a maioria nunca abre a preferência do
 * aplicativo.
 */
const ContextoDoTema = createContext<Tema>(CLARO);

export function ProvedorDeTema({ children }: { children: ReactNode }) {
  const esquema = useColorScheme();
  const tema = useMemo(() => (esquema === 'dark' ? ESCURO : CLARO), [esquema]);

  return <ContextoDoTema.Provider value={tema}>{children}</ContextoDoTema.Provider>;
}

export function useTema(): Tema {
  return useContext(ContextoDoTema);
}
