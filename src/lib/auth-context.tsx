import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext<{
  signIn: (token: string) => void;
  signOut: () => void;
  session?: string | null;
  isLoading: boolean;
}>({ signIn: () => {}, signOut: () => {}, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync('userToken').then((token) => {
      setSession(token);
      setIsLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      // Mark these as async to ensure the data is saved before updating state
      signIn: async (token: string) => {
        await SecureStore.setItemAsync('userToken', token);
        setSession(token);
      },
      signOut: async () => {
        await SecureStore.deleteItemAsync('userToken');
        setSession(null);
      },
      session,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);