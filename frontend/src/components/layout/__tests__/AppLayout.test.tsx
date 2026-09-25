import { UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../../store/authStore';
import { httpError, installApi } from '../../../test/apiMock';
import AppLayout from '../AppLayout';

function Boom(): never {
  throw new Error('Сторінка зламалась');
}

const renderLayout = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Сторінка входу</p>} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<p>Вміст головної</p>} />
          <Route path="/grades" element={<Boom />} />
          <Route path="/schedule" element={<p>Вміст розкладу</p>} />
          <Route path="/students" element={<p>Вміст студентів</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

const signIn = (role: UserRole) =>
  useAuthStore
    .getState()
    .setAuth({ id: 'user-1', role, firstName: 'Анна', lastName: 'Коваленко' } as IUser, 'token');

beforeEach(() => {
  signIn(UserRole.ADMIN);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppLayout — ErrorBoundary сторінки', () => {
  it('помилка рендеру сторінки не забирає навігацію, а перехід на інший розділ її знімає', async () => {
    // React і сам boundary логують перехоплену помилку — у виводі тесту це шум
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderLayout('/grades');

    expect(screen.getByText('Сторінка не відкрилась')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Основна навігація' });

    await userEvent.click(within(nav).getByRole('link', { name: /Розклад/ }));

    expect(screen.getByText('Вміст розкладу')).toBeInTheDocument();
    expect(screen.queryByText('Сторінка не відкрилась')).not.toBeInTheDocument();
  });
});

describe('BottomNav', () => {
  it('має чотири розділи з ТЗ і меню «Ще»', () => {
    renderLayout('/');
    const nav = screen.getByRole('navigation', { name: 'Основна навігація' });

    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['Головна', 'Розклад', 'Оцінки', 'Монети']);
    expect(within(nav).getByRole('button', { name: 'Ще' })).toBeInTheDocument();
  });

  it('у меню «Ще» — розділи ролі, профіль і вихід', async () => {
    renderLayout('/');

    await userEvent.click(screen.getByRole('button', { name: 'Ще' }));
    const menu = await screen.findByRole('dialog');

    expect(
      within(menu)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['АКАнна КоваленкоАдміністратор', 'Студенти', 'Викладачі', 'Групи', 'Налаштування']);
    expect(within(menu).getByRole('button', { name: 'Вийти' })).toBeInTheDocument();
  });

  it('студент не бачить адмінських розділів', async () => {
    signIn(UserRole.STUDENT);
    renderLayout('/');

    await userEvent.click(screen.getByRole('button', { name: 'Ще' }));
    const menu = await screen.findByRole('dialog');

    expect(within(menu).queryByRole('link', { name: 'Студенти' })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('link', { name: 'Групи' })).not.toBeInTheDocument();
  });

  // Сервер недоступний — користувач однаково має вийти, а не лишитися «напівзалогіненим»
  it('вихід завершує сесію навіть коли сервер не відповів', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    installApi({
      'POST /auth/logout': (config) => {
        throw httpError(config, 500);
      },
    });
    renderLayout('/');

    await userEvent.click(screen.getByRole('button', { name: 'Ще' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Вийти' }));

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
