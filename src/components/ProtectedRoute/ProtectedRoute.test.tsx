import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import * as AuthContextModule from '@/contexts/AuthContext';

function renderWithRouter(initialEntry: string, authOverride: Partial<ReturnType<typeof AuthContextModule.useAuth>>) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    handleToken: vi.fn(),
    ...authOverride,
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/app/todos" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when unauthenticated', () => {
    renderWithRouter('/app/todos', { user: null });
    expect(screen.getByText('Login Page')).toBeTruthy();
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('renders protected content when authenticated', () => {
    renderWithRouter('/app/todos', {
      user: { id: '1', name: 'Test User' },
    });
    expect(screen.getByText('Protected Content')).toBeTruthy();
    expect(screen.queryByText('Login Page')).toBeNull();
  });
});
