import { UserRole } from '@redmonkey/shared';
import { AxiosError } from 'axios';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';
import { installApi } from '../test/apiMock';
import App from '../App';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
// Справжній Toaster читає window.matchMedia, якого в jsdom немає
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));

beforeEach(() => {
  window.history.pushState({}, '', '/does-not-exist');
  // Стан після перезавантаження сторінки: токен у localStorage є, профілю ще немає
  useAuthStore.setState({ user: null, accessToken: 'token', isAuthenticated: true });
});

describe('App — відновлення сесії', () => {
  // Раніше будь-яка помилка /auth/me розлогінювала: сервер лежить — і ти вже на екрані входу
  it('при недоступному сервері не розлогінює, а пропонує спробувати знову', async () => {
    let serverDown = true;
    installApi({
      '/auth/me': (config) => {
        if (serverDown) throw new AxiosError('Network Error', 'ERR_NETWORK', config);
        return { id: 'user-1', role: UserRole.STUDENT, firstName: 'Анна', lastName: 'Коваленко' };
      },
    });
    render(<App />);

    expect(await screen.findByText('Не вдалося відкрити LMS')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    serverDown = false;
    await userEvent.click(screen.getByRole('button', { name: 'Спробувати знову' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Сторінку не знайдено' })).toBeInTheDocument();
  });

  it('поки профіль вантажиться, показує каркас інтерфейсу, а не голий текст', () => {
    installApi({ '/auth/me': () => new Promise(() => {}) });

    render(<App />);

    expect(screen.getByLabelText('Завантаження')).toBeInTheDocument();
  });
});
