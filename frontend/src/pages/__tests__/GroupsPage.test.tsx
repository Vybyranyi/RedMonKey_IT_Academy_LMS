import { UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { callsTo, installApi } from '../../test/apiMock';
import GroupsPage from '../GroupsPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const admin = {
  id: 'admin-1',
  role: UserRole.ADMIN,
  firstName: 'Ірина',
  lastName: 'Адміненко',
} as IUser;
const oleh = { id: 'teacher-1', firstName: 'Олег', lastName: 'Петренко' } as IUser;

const js1 = {
  id: 'group-1',
  name: 'JS-1',
  description: 'Frontend',
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2027-06-30T00:00:00.000Z',
  isActive: true,
  teachers: [oleh],
  students: [],
};

function StudentsStub() {
  const { search } = useLocation();
  return <p>Студенти {search}</p>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/groups']}>
      <Routes>
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/students" element={<StudentsStub />} />
      </Routes>
    </MemoryRouter>
  );

/** Меню «⋯» картки групи → пункт */
const openGroupAction = async (action: string) => {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Дії з групою JS-1' }));
  await user.click(await screen.findByRole('menuitem', { name: action }));
};

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  useAuthStore.getState().setAuth(admin, 'token');
});

describe('GroupsPage — склад групи', () => {
  // Раніше кнопка лише писала в консоль
  it('«Переглянути склад» веде на студентів із фільтром цієї групи', async () => {
    installApi({ '/groups': () => [js1] });
    renderPage();

    await userEvent.click(await screen.findByRole('link', { name: 'Переглянути склад' }));

    expect(screen.getByText('Студенти ?groupId=group-1')).toBeInTheDocument();
  });
});

describe('GroupsPage — редагування', () => {
  it('форма відкривається з поточними даними і зберігає зміни без перезапиту списку', async () => {
    const adapter = installApi({
      'GET /groups': () => [js1],
      'GET /users': () => [oleh],
      'PATCH /groups/group-1': (config) => ({ ...js1, ...JSON.parse(config.data) }),
    });
    renderPage();

    await openGroupAction('Редагувати');

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Назва групи *')).toHaveValue('JS-1');
    expect(within(dialog).getByLabelText('Дата початку')).toHaveValue('2026-09-01');
    expect(await within(dialog).findByLabelText('Олег Петренко')).toBeChecked();

    const name = within(dialog).getByLabelText('Назва групи *');
    await userEvent.clear(name);
    await userEvent.type(name, 'JS-1 Pro');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText('JS-1 Pro')).toBeInTheDocument();
    const [patch] = callsTo(adapter, 'PATCH', '/groups/group-1');
    expect(JSON.parse(patch.data)).toMatchObject({ name: 'JS-1 Pro', teachers: ['teacher-1'] });
    expect(callsTo(adapter, 'GET', '/groups')).toHaveLength(1);
    expect(toast.success).toHaveBeenCalledWith('Групу «JS-1 Pro» збережено');
  });
});

describe('GroupsPage — деактивація', () => {
  it('після підтвердження деактивує групу і прибирає картку', async () => {
    const adapter = installApi({
      'GET /groups': () => [js1],
      'DELETE /groups/group-1': () => ({ message: 'ok' }),
    });
    renderPage();

    await openGroupAction('Деактивувати');

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Група «JS-1» зникне зі списків');
    expect(callsTo(adapter, 'DELETE', '/groups/group-1')).toHaveLength(0);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Деактивувати' }));

    expect(await screen.findByText('Груп ще немає')).toBeInTheDocument();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Групу «JS-1» деактивовано'));
  });
});
