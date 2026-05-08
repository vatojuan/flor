import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getToken, setToken, removeToken, parseJwt, WEB_API } from '../services/api';
import { loginWithCredentials, loginWithGoogle as loginWithGoogleApi } from '../services/auth';

export interface User {
  id: number;
  role: string;
  name: string;
  profilePicture?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
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
  loginWithGoogle: async () => {},
  loginWithToken: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Fetch full user info from backend using the JWT
async function fetchUserInfo(jwt: string): Promise<User | null> {
  try {
    const res = await fetch(`${WEB_API}/api/auth/user-info`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      role: data.role || 'empleado',
      name: data.name || 'Usuario',
      profilePicture: data.profilePicture || undefined,
    };
  } catch {
    return null;
  }
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token + fetch user info from backend
  const initWithToken = useCallback(async (jwt: string) => {
    await setToken(jwt);
    setTokenState(jwt);

    // Fetch real user info from backend
    const userInfo = await fetchUserInfo(jwt);
    if (userInfo) {
      setUser(userInfo);
    } else {
      // Fallback to JWT payload
      const payload = parseJwt(jwt);
      if (payload) {
        setUser({ id: payload.sub, role: payload.role || 'empleado', name: payload.name || 'Usuario' });
      }
    }
  }, []);

  const loadToken = useCallback(async () => {
    try {
      const stored = await getToken();
      if (stored) {
        await initWithToken(stored);
      }
    } catch {
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  }, [initWithToken]);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginWithCredentials(email, password);
    const jwt = data.token || data.access_token;
    if (!jwt) throw new Error('No se recibio token');
    await initWithToken(jwt);
  }, [initWithToken]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const data = await loginWithGoogleApi(idToken);
    const jwt = data.token || data.access_token;
    if (!jwt) throw new Error('No se recibio token');
    await initWithToken(jwt);
  }, [initWithToken]);

  const loginWithTokenFn = useCallback(async (jwt: string) => {
    await initWithToken(jwt);
  }, [initWithToken]);

  const logout = useCallback(async () => {
    await removeToken();
    setUser(null);
    setTokenState(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (token) {
      const userInfo = await fetchUserInfo(token);
      if (userInfo) setUser(userInfo);
    }
  }, [token]);

  return {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    loginWithGoogle,
    loginWithToken: loginWithTokenFn,
    logout,
    refreshUser,
  };
}
