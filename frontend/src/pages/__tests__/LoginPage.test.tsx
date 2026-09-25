import { UserRole } from '@redmonkey/shared';
import axios from 'axios';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { httpError, installApi } from '../../test/apiMock';
import LoginPage from '../LoginPage';

const renderLogin = (from?: string) =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/login', state: from ? { from: { pathname: from } } : null }]}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Головна</p>} />
        <Route path="/grades" element={<p>Журнал</p>} />
      </Routes>
    </MemoryRouter>
  );

const submit = async (password: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('admin@academy.com'), 'anna@academy.ua');
  await user.type(screen.getByPlaceholderText('••••••••'), password);
  await user.click(screen.getByRole('button', { name: 'Увійти' }));
};

beforeEach(() => {
  useAuthStore.getState().clearAuth();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LoginPage', () => {
  // Раніше 401 від логіну запускав рефреш, і користувач бачив помилку рефрешу
  it('показує причину відмови від бекенда, без спроби рефрешу', async () => {
    const refresh = vi.spyOn(axios, 'post');
    installApi({
      'POST /auth/login': (config) => {
        throw httpError(config, 401, 'Невірний email або пароль');
      },
    });
    renderLogin();

    await submit('wrong-password');

    expect(await screen.findByText('Невірний email або пароль')).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  // Сесія протухла на журналі — після входу користувач повертається в журнал
  it('після входу повертає на сторінку, з якої викинуло', async () => {
    installApi({
      'POST /auth/login': () => ({
        accessToken: 'token',
        user: { id: 'user-1', role: UserRole.TEACHER, firstName: 'Олег', lastName: 'Петренко' },
      }),
    });
    renderLogin('/grades');

    await submit('Password123!');

    expect(await screen.findByText('Журнал')).toBeInTheDocument();
  });

  it('без збереженої сторінки веде на головну', async () => {
    installApi({
      'POST /auth/login': () => ({
        accessToken: 'token',
        user: { id: 'user-1', role: UserRole.TEACHER, firstName: 'Олег', lastName: 'Петренко' },
      }),
    });
    renderLogin();

    await submit('Password123!');

    expect(await screen.findByText('Головна')).toBeInTheDocument();
  });
});
