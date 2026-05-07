import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getToken, setToken, removeToken, parseJwt } from '../services/api';
import { loginWithCredentials } from '../services/auth';

export interface User {
  id: number;
  role: string;
  name: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  loginWithToken: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadToken = useCallback(async () => {
    try {
      const stored = await getToken();
      if (stored) {
        const payload = parseJwt(stored);
        if (payload) {
          setUser({ id: payload.sub, role: payload.role, name: payload.name });
          setTokenState(stored);
        } else {
          await removeToken();
        }
      }
    } catch {
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginWithCredentials(email, password);
    const jwt = data.token || data.access_token;
    if (!jwt) throw new Error('No se recibio token');
    await setToken(jwt);
    const payload = parseJwt(jwt);
    if (payload) {
      setUser({ id: payload.sub, role: payload.role, name: payload.name });
      setTokenState(jwt);
    }
  }, []);

  const loginWithTokenFn = useCallback(async (jwt: string) => {
    await setToken(jwt);
    const payload = parseJwt(jwt);
    if (payload) {
      setUser({ id: payload.sub, role: payload.role, name: payload.name });
      setTokenState(jwt);
    }
  }, []);

  const logout = useCallback(async () => {
    await removeToken();
    setUser(null);
    setTokenState(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await loadToken();
  }, [loadToken]);

  return {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    loginWithToken: loginWithTokenFn,
    logout,
    refreshUser,
  };
}
