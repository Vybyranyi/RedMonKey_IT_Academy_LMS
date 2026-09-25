import { UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import AppRouter from '..';

const openAt = (path: string, role: UserRole) => {
  window.history.pushState({}, '', path);
  useAuthStore
    .getState()
    .setAuth({ id: 'user-1', role, firstName: 'Анна', lastName: 'Коваленко' } as IUser, 'token');
  return render(<AppRouter />);
};

beforeEach(() => {
  useAuthStore.getState().clearAuth();
});

describe('AppRouter', () => {
  // Раніше невідомий URL давав порожній екран без навігації
  it('невідомий URL показує 404 всередині layout з навігацією', () => {
    openAt('/does-not-exist', UserRole.STUDENT);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Сторінку не знайдено' })
    ).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Основна навігація' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'На головну' })).toHaveAttribute('href', '/');
  });

  // /students/abc колись показував заголовок «Студенти» над чужим вмістом
  it('вкладений шлях під відомим розділом — теж 404', () => {
    openAt('/students/abc', UserRole.ADMIN);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Сторінку не знайдено' })
    ).toBeInTheDocument();
  });

  it('розділ, недоступний ролі, показує 403 із відповідним заголовком', () => {
    openAt('/teachers', UserRole.STUDENT);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Доступ заборонено' })
    ).toBeInTheDocument();
    expect(screen.getByText('403')).toBeInTheDocument();
  });

  it('гостя з невідомого URL відправляє на вхід', () => {
    window.history.pushState({}, '', '/does-not-exist');

    render(<AppRouter />);

    expect(screen.getByText('Вхід до системи')).toBeInTheDocument();
  });
});
