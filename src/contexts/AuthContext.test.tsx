import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

// Minimal valid JWT with payload { sub: '1', name: 'Test User' }
const mockPayload = btoa(JSON.stringify({ sub: '1', name: 'Test User' }));
const mockToken = `header.${mockPayload}.signature`;

function TestComponent() {
  const { user, login, logout, handleToken } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'null'}</span>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => handleToken(mockToken)}>HandleToken</button>
    </div>
  );
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

describe('AuthContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.restoreAllMocks();
  });

  it('initial state (no token): user is null', () => {
    render(<AuthProvider><TestComponent /></AuthProvider>);
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('session rehydration: pre-set token → user decoded from JWT', () => {
    localStorageMock.setItem('session_token', mockToken);
    render(<AuthProvider><TestComponent /></AuthProvider>);
    expect(screen.getByTestId('user').textContent).toBe('Test User');
  });

  it('handleToken(): decodes token, sets user, stores in localStorage', () => {
    render(<AuthProvider><TestComponent /></AuthProvider>);
    act(() => { screen.getByText('HandleToken').click(); });
    expect(screen.getByTestId('user').textContent).toBe('Test User');
    expect(localStorageMock.getItem('session_token')).toBe(mockToken);
  });

  it('login(): redirects to backend OAuth URL', () => {
    const locationMock = { href: '' };
    vi.stubGlobal('location', locationMock);
    render(<AuthProvider><TestComponent /></AuthProvider>);
    act(() => { screen.getByText('Login').click(); });
    expect(locationMock.href).toContain('/oauth2/authorization/google');
  });

  it('logout(): clears user and removes token from localStorage', () => {
    localStorageMock.setItem('session_token', mockToken);
    render(<AuthProvider><TestComponent /></AuthProvider>);
    act(() => { screen.getByText('Logout').click(); });
    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(localStorageMock.getItem('session_token')).toBeNull();
  });

  it('useAuth() outside provider throws an error', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider');
    console.error = consoleError;
  });
});
