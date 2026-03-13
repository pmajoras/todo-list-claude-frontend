import { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  login: () => void;
  logout: () => void;
  handleToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'session_token';
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function decodeToken(token: string): User {
  const payload = JSON.parse(atob(token.split('.')[1])) as { sub: string; name: string };
  return { id: payload.sub, name: payload.name };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const existingToken = localStorage.getItem(TOKEN_KEY);
  const [user, setUser] = useState<User | null>(existingToken ? decodeToken(existingToken) : null);

  function login(): void {
    window.location.href = `${API_BASE}/oauth2/authorization/google`;
  }

  function handleToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(decodeToken(token));
  }

  function logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, handleToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
