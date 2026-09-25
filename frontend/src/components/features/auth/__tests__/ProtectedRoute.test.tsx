import { UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../../../../store/authStore';
import ProtectedRoute from '../ProtectedRoute';

const renderAt = (path: string, allowedRoles?: UserRole[]) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Сторінка входу</p>} />
        <Route path="/" element={<p>Дашборд</p>} />
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/users" element={<p>Користувачі</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

const signIn = (role: UserRole) =>
  useAuthStore.getState().setAuth({ id: 'user-1', role } as IUser, 'token');

beforeEach(() => {
  useAuthStore.getState().clearAuth();
});

describe('ProtectedRoute', () => {
  it('неавторизованого відправляє на сторінку входу', () => {
    renderAt('/users');

    expect(screen.getByText('Сторінка входу')).toBeInTheDocument();
  });

  it('авторизованого пускає на маршрут без обмеження ролей', () => {
    signIn(UserRole.STUDENT);

    renderAt('/users');

    expect(screen.getByText('Користувачі')).toBeInTheDocument();
  });

  it('пускає користувача з дозволеною роллю', () => {
    signIn(UserRole.ADMIN);

    renderAt('/users', [UserRole.ADMIN]);

    expect(screen.getByText('Користувачі')).toBeInTheDocument();
  });

  // Приховати кнопку в UI недостатньо — маршрут теж має бути закритий
  it('повертає на головну користувача з недозволеною роллю', () => {
    signIn(UserRole.STUDENT);

    renderAt('/users', [UserRole.ADMIN]);

    expect(screen.getByText('Дашборд')).toBeInTheDocument();
    expect(screen.queryByText('Користувачі')).not.toBeInTheDocument();
  });
});
