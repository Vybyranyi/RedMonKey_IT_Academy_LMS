import { UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';
import { installApi } from '../test/apiMock';
import LoginPage from '../pages/LoginPage';
import StudentsPage from '../pages/StudentsPage';
import GroupsPage from '../pages/GroupsPage';
import TeachersPage from '../pages/TeachersPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

/**
 * Автоматична a11y-перевірка (axe): мітки полів, імена кнопок, ролі, aria-атрибути.
 * Контраст кольорів тут не міряється — у jsdom немає стилів, його перевіряють вручну.
 */
const admin = { id: 'admin-1', role: UserRole.ADMIN, firstName: 'Ірина', lastName: 'А' } as IUser;
const anna = {
  id: 'student-1',
  firstName: 'Анна',
  lastName: 'Коваленко',
  email: 'anna@academy.ua',
  role: UserRole.STUDENT,
  isActive: true,
} as IUser;
const oleh = {
  id: 'teacher-1',
  firstName: 'Олег',
  lastName: 'Петренко',
  email: 'oleh@academy.ua',
  role: UserRole.TEACHER,
  isActive: true,
} as IUser;
const group = {
  id: 'group-1',
  name: 'JS-1',
  description: 'Frontend',
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2027-06-30T00:00:00.000Z',
  isActive: true,
  teachers: [oleh],
  students: [anna],
};

const checkA11y = async (container: HTMLElement) => {
  const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
};

beforeEach(() => {
  useAuthStore.getState().setAuth(admin, 'token');
  installApi({ '/groups': () => [group], '/users': () => [anna, oleh] });
});

describe('a11y — сторінки без порушень axe', () => {
  it('вхід', async () => {
    useAuthStore.getState().clearAuth();
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    await screen.findByRole('button', { name: 'Увійти' });
    await checkA11y(container);
  });

  it('студенти', async () => {
    const { container } = render(
      <MemoryRouter>
        <StudentsPage />
      </MemoryRouter>
    );
    await screen.findByText('Анна Коваленко');
    await checkA11y(container);
  });

  it('групи', async () => {
    const { container } = render(
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>
    );
    await screen.findByText('JS-1');
    await checkA11y(container);
  });

  it('викладачі', async () => {
    const { container } = render(
      <MemoryRouter>
        <TeachersPage />
      </MemoryRouter>
    );
    await screen.findByText('Олег Петренко');
    await checkA11y(container);
  });

  // Діалог рендериться в портал — перевіряємо document.body, а не container сторінки
  it('редагування викладача з аватаркою', async () => {
    render(
      <MemoryRouter>
        <TeachersPage />
      </MemoryRouter>
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Редагувати: Олег Петренко' }));
    await screen.findByRole('button', { name: /Завантажити фото/ });
    await checkA11y(screen.getByRole('dialog'));
  });
});
