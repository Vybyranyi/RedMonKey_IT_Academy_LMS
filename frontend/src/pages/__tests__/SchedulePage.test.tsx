import { LessonStatus, LessonType, UserRole } from '@redmonkey/shared';
import type { IPopulatedLesson, IUser } from '@redmonkey/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { callsTo, installApi } from '../../test/apiMock';
import SchedulePage from '../SchedulePage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const admin = {
  id: 'admin-1',
  role: UserRole.ADMIN,
  firstName: 'Ірина',
  lastName: 'Адміненко',
} as IUser;

// Заняття сьогодні о 12:00 за місцевим часом — завжди у видимому тижні
// Форма перевіряє id групи й викладача як UUID
const GROUP_ID = '11111111-1111-4111-8111-111111111111';
const TEACHER_ID = '22222222-2222-4222-8222-222222222222';

const today = new Date();
today.setHours(12, 0, 0, 0);

const lesson = {
  id: 'lesson-1',
  title: 'Вступ до JS',
  description: '',
  date: today.toISOString(),
  duration: 80,
  type: LessonType.LECTURE,
  status: LessonStatus.SCHEDULED,
  groupId: GROUP_ID,
  teacherId: TEACHER_ID,
  group: { id: GROUP_ID, name: 'JS-1' },
  teacher: { id: TEACHER_ID, firstName: 'Олег', lastName: 'Петренко' },
} as IPopulatedLesson;

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  useAuthStore.getState().setAuth(admin, 'token');
});

describe('SchedulePage — редагування заняття', () => {
  it('з деталей відкриває форму з даними заняття і шле лише змінені поля', async () => {
    const adapter = installApi({
      'GET /lessons': () => [lesson],
      '/users': () => [],
      '/attendance': () => [],
      '/groups': () => [{ id: GROUP_ID, name: 'JS-1', teachers: [], students: [] }],
      'PATCH /lessons/lesson-1': (config) => ({ ...lesson, ...JSON.parse(config.data) }),
    });
    render(<SchedulePage />);

    await userEvent.click(await screen.findByText('Вступ до JS'));
    await userEvent.click(await screen.findByRole('button', { name: 'Редагувати' }));

    const form = await screen.findByRole('dialog', { name: 'Редагування заняття' });
    const title = within(form).getByLabelText('Назва *');
    expect(title).toHaveValue('Вступ до JS');
    expect(within(form).getByLabelText('Час *')).toHaveValue('12:00');

    await userEvent.clear(title);
    await userEvent.type(title, 'Основи JS');
    await userEvent.click(within(form).getByRole('button', { name: 'Зберегти' }));

    expect(await screen.findByText('Основи JS')).toBeInTheDocument();
    const [patch] = callsTo(adapter, 'PATCH', '/lessons/lesson-1');
    expect(JSON.parse(patch.data)).toEqual({ title: 'Основи JS' });
    expect(callsTo(adapter, 'GET', '/lessons')).toHaveLength(1);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Заняття збережено'));
  });

  it('скасоване заняття в календарі підписане «скасовано»', async () => {
    installApi({ 'GET /lessons': () => [{ ...lesson, status: LessonStatus.CANCELLED }] });

    render(<SchedulePage />);

    expect(await screen.findByText(/скасовано/)).toBeInTheDocument();
  });
});
