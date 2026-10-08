import { UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { callsTo, httpError, installApi } from '../../test/apiMock';
import TeachersPage from '../TeachersPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const admin = {
  id: 'admin-1',
  role: UserRole.ADMIN,
  firstName: 'Ірина',
  lastName: 'Адміненко',
} as IUser;
const oleh = {
  id: 'teacher-1',
  firstName: 'Олег',
  lastName: 'Петренко',
  email: 'oleh@academy.ua',
  role: UserRole.TEACHER,
} as IUser;
const maria = {
  id: 'teacher-2',
  firstName: 'Марія',
  lastName: 'Шевченко',
  email: 'maria@academy.ua',
  role: UserRole.TEACHER,
} as IUser;
const students = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `s-${i}` }) as IUser);

const groups = [
  { id: 'group-1', name: 'JS-1', teachers: [oleh], students: students(12) },
  { id: 'group-2', name: 'JS-2', teachers: [oleh], students: students(8) },
];

const cardOf = (name: string) => screen.getByText(name).closest('[data-slot=card]') as HTMLElement;

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  useAuthStore.getState().setAuth(admin, 'token');
});

describe('TeachersPage — групи й студенти викладача', () => {
  // Раніше картка читала поля, яких бекенд не віддає, і кожен викладач мав «0 груп»
  it('рахує групи й студентів зі складу груп', async () => {
    installApi({ '/users': () => [oleh, maria], '/groups': () => groups });

    render(<TeachersPage />);

    await screen.findByText('Олег Петренко');
    const olehCard = cardOf('Олег Петренко');
    expect(within(olehCard).getByText('JS-1')).toBeInTheDocument();
    expect(within(olehCard).getByText('JS-2')).toBeInTheDocument();
    expect(within(olehCard).getByText('групи').previousSibling).toHaveTextContent('2');
    expect(within(olehCard).getByText('студентів').previousSibling).toHaveTextContent('20');
    expect(within(olehCard).getByText('oleh@academy.ua')).toBeInTheDocument();

    const mariaCard = cardOf('Марія Шевченко');
    expect(within(mariaCard).getByText('Не закріплений за групами')).toBeInTheDocument();
    expect(within(mariaCard).getByText('груп').previousSibling).toHaveTextContent('0');
  });

  it('у картці викладача — ті самі групи', async () => {
    installApi({ '/users': () => [oleh], '/groups': () => groups });
    render(<TeachersPage />);
    await screen.findByText('Олег Петренко');

    await userEvent.click(
      screen.getByRole('button', { name: 'Переглянути картку: Олег Петренко' })
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('JS-1')).toBeInTheDocument();
    expect(within(dialog).getByText('JS-2')).toBeInTheDocument();
    expect(within(dialog).queryByText('Предмети')).not.toBeInTheDocument();
  });
});

describe('TeachersPage — деактивація', () => {
  it('після підтвердження деактивує викладача і прибирає картку', async () => {
    const adapter = installApi({
      'GET /users': () => [oleh, maria],
      '/groups': () => groups,
      'DELETE /users/teacher-2': () => ({ message: 'ok' }),
    });
    render(<TeachersPage />);
    await screen.findByText('Марія Шевченко');

    await userEvent.click(screen.getByRole('button', { name: 'Деактивувати: Марія Шевченко' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(callsTo(adapter, 'DELETE', '/users/teacher-2')).toHaveLength(0);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Деактивувати' }));

    await waitFor(() => expect(screen.queryByText('Марія Шевченко')).not.toBeInTheDocument());
    expect(screen.getByText('Олег Петренко')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Викладача Марія Шевченко деактивовано');
  });

  it('при відмові сервера лишає діалог відкритим і картку на місці', async () => {
    installApi({
      'GET /users': () => [maria],
      '/groups': () => [],
      'DELETE /users/teacher-2': (config) => {
        throw httpError(config, 400, 'Щось пішло не так');
      },
    });
    render(<TeachersPage />);
    await screen.findByText('Марія Шевченко');

    await userEvent.click(screen.getByRole('button', { name: 'Деактивувати: Марія Шевченко' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Деактивувати' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Щось пішло не так', expect.anything())
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(
      screen.getByText('Марія Шевченко', { selector: '[data-slot=card-title]' })
    ).toBeInTheDocument();
  });
});

describe('TeachersPage — аватарка викладача', () => {
  it('адмін змінює фото з діалогу редагування, і воно лишається після закриття', async () => {
    const avatar = 'https://ref.supabase.co/storage/v1/object/public/avatars/teacher-1/new.webp';
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    const adapter = installApi({
      'GET /users': () => [oleh],
      '/groups': () => [],
      'PUT /users/teacher-1/avatar': () => ({ ...oleh, avatar }),
    });
    render(<TeachersPage />);
    await screen.findByText('Олег Петренко');

    await userEvent.click(screen.getByRole('button', { name: 'Редагувати: Олег Петренко' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.upload(
      within(dialog).getByTestId('avatar-input'),
      new File(['x'], 'oleh.png', { type: 'image/png' })
    );

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Фото оновлено'));
    expect(callsTo(adapter, 'PUT', '/users/teacher-1/avatar')).toHaveLength(1);
    // Фото вже є — тепер можна і видалити; діалог показує свіжий стан, а не знімок
    expect(within(dialog).getByRole('button', { name: /Змінити фото/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Видалити фото/ })).toBeInTheDocument();
    // Список не перезапитується — картку оновлено точково
    expect(callsTo(adapter, 'GET', '/users')).toHaveLength(1);
  });
});
