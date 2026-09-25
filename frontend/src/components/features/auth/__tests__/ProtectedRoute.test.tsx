import { UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../../../../store/authStore';
import ProtectedRoute from '../ProtectedRoute';

/** Сторінка входу показує, куди ProtectedRoute просить повернути після логіну */
function LoginStub() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from;
  return <p>Сторінка входу, повернення на {from?.pathname ?? '—'}</p>;
}

const renderAt = (path: string, allowedRoles?: UserRole[]) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginStub />} />
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
  // Після входу (зокрема після протухлої сесії) LoginPage поверне саме сюди
  it("неавторизованого відправляє на вхід і запам'ятовує, куди він ішов", () => {
    renderAt('/users');

    expect(screen.getByText('Сторінка входу, повернення на /users')).toBeInTheDocument();
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

  // Приховати кнопку в UI недостатньо — маршрут теж має бути закритий. І не
  // мовчки на головну: користувач має зрозуміти, чому сторінка не відкрилась
  it('показує стан 403 користувачу з недозволеною роллю', () => {
    signIn(UserRole.STUDENT);

    renderAt('/users', [UserRole.ADMIN]);

    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByText('Цей розділ вам недоступний')).toBeInTheDocument();
    expect(screen.queryByText('Користувачі')).not.toBeInTheDocument();
  });
});
