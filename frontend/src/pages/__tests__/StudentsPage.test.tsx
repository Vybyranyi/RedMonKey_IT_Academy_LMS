import { UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import type { InternalAxiosRequestConfig } from 'axios';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { deferred, installApi } from '../../test/apiMock';
import StudentsPage from '../StudentsPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const admin = {
  id: 'admin-1',
  role: UserRole.ADMIN,
  firstName: 'Ірина',
  lastName: 'Адміненко',
} as IUser;
const anna = {
  id: 'student-1',
  firstName: 'Анна',
  lastName: 'Коваленко',
  email: 'anna@academy.ua',
  role: UserRole.STUDENT,
  isActive: true,
} as IUser;

beforeEach(() => {
  useAuthStore.getState().setAuth(admin, 'token');
});

describe('StudentsPage — пошук', () => {
  // Відповідь на «А» могла прийти після відповіді на «Ан» і перезаписати список
  it('кожна нова літера скасовує попередній запит', async () => {
    const requests: InternalAxiosRequestConfig[] = [];
    installApi({
      '/groups': () => [],
      '/users': (config) => {
        requests.push(config);
        // Перша відповідь — одразу, пошукові «зависають», поки їх не скасують
        return requests.length === 1 ? [anna] : deferred().promise;
      },
    });
    render(<StudentsPage />);
    await screen.findByText('Анна Коваленко');

    await userEvent.type(screen.getByPlaceholderText('Пошук за іменем або email...'), 'Ан');

    const searches = requests.slice(1);
    expect(searches.map((config) => config.params.q)).toEqual(['А', 'Ан']);
    expect(searches[0].signal?.aborted).toBe(true);
    expect(searches[1].signal?.aborted).toBe(false);
    // Поки новий результат не прийшов, старий список лишається видимим — без скелетона
    expect(screen.getByText('Анна Коваленко')).toBeInTheDocument();
  });

  it('порожній результат пошуку пропонує скинути фільтри', async () => {
    installApi({
      '/groups': () => [],
      '/users': (config) => (config.params.q ? [] : [anna]),
    });
    render(<StudentsPage />);
    await screen.findByText('Анна Коваленко');

    await userEvent.type(screen.getByPlaceholderText('Пошук за іменем або email...'), 'Зоряна');
    await userEvent.click(await screen.findByRole('button', { name: 'Скинути фільтри' }));

    expect(await screen.findByText('Анна Коваленко')).toBeInTheDocument();
  });

  it('без жодного студента показує заклик додати першого', async () => {
    installApi({ '/groups': () => [], '/users': () => [] });

    render(<StudentsPage />);

    expect(await screen.findByText('Студентів ще немає')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Додати студента' })).toHaveLength(2);
  });
});

describe('StudentsPage — бал і відвідуваність', () => {
  it('просить агрегати в бекенда й показує їх у таблиці', async () => {
    const requests: InternalAxiosRequestConfig[] = [];
    installApi({
      '/groups': () => [],
      '/users': (config) => {
        requests.push(config);
        return [{ ...anna, stats: { averageGrade: 10.5, attendanceRate: 95 } }];
      },
    });

    render(<StudentsPage />);

    expect(await screen.findByText('10.5')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(requests[0]?.params).toMatchObject({ role: UserRole.STUDENT, withStats: true });
  });

  // Відповідь POST /users — без stats: новий рядок не має виглядати як «0» у червоному
  it('щойно створений студент — без оцінок і явки, а не з нулями', async () => {
    installApi({
      '/groups': () => [],
      'GET /users': () => [],
      'POST /users': () => ({ ...anna, id: 'student-2', firstName: 'Богдан' }),
    });
    render(<StudentsPage />);
    await screen.findByText('Студентів ще немає');

    await userEvent.click(screen.getAllByRole('button', { name: 'Додати студента' })[0]!);
    await userEvent.type(screen.getByLabelText("Ім'я *"), 'Богдан');
    await userEvent.type(screen.getByLabelText('Прізвище *'), 'Коваленко');
    await userEvent.type(screen.getByLabelText('Email *'), 'bohdan@academy.ua');
    await userEvent.click(screen.getByRole('button', { name: 'Генерувати Пароль' }));
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти' }));

    const row = (await screen.findByText('Богдан Коваленко')).closest('tr')!;
    expect(within(row).getByTitle('Оцінок ще немає')).toHaveTextContent('—');
    expect(within(row).getByTitle('Відміток явки ще немає')).toHaveTextContent('—');
  });
});
