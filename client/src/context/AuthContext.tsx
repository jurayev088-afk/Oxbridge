import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchMe,
  getHomePath,
  getPostLoginPath,
  getStoredToken,
  loginRequest,
  setStoredToken,
  type AuthUser,
} from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = getStoredToken();
      if (!stored) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      try {
        const me = await fetchMe(stored);
        if (!cancelled) {
          setToken(stored);
          setUser(me);
        }
      } catch {
        setStoredToken(null);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(loginName: string, password: string) {
    const result = await loginRequest(loginName, password);
    setStoredToken(result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }

  function logout() {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    if (!token) return;
    const me = await fetchMe(token);
    setUser(me);
  }

  const value = useMemo(
    () => ({ user, token, loading, login, logout, refreshUser }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak');
  return ctx;
}

export { getHomePath, getPostLoginPath };
