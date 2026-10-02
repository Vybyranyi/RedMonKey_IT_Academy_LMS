import type { ComponentProps } from 'react';
import { AttendanceStatus, LessonStatus, LessonType, UserRole } from '@redmonkey/shared';
import type { IPopulatedLesson, IUser } from '@redmonkey/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../../../store/authStore';
import { callsTo, installApi } from '../../../../test/apiMock';
import LessonDetailsModal from '../LessonDetailsModal';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const admin = {
  id: 'admin-1',
  role: UserRole.ADMIN,
  firstName: 'Ірина',
  lastName: 'Адміненко',
} as IUser;

const lesson = {
  id: 'lesson-1',
  title: 'Вступ до JS',
  date: '2026-09-01T15:00:00.000Z',
  duration: 80,
  type: LessonType.LECTURE,
  status: LessonStatus.SCHEDULED,
  groupId: 'group-1',
  teacherId: 'teacher-1',
  group: { id: 'group-1', name: 'JS-1' },
  teacher: { id: 'teacher-1', firstName: 'Олег', lastName: 'Петренко' },
} as IPopulatedLesson;

const students = [
  { id: 'student-1', firstName: 'Анна', lastName: 'Коваленко' },
  { id: 'student-2', firstName: 'Богдан', lastName: 'Мельник' },
] as IUser[];

beforeEach(() => {
  useAuthStore.getState().setAuth(admin, 'token');
});

const teacher = {
  id: 'teacher-1',
  role: UserRole.TEACHER,
  firstName: 'Олег',
  lastName: 'Петренко',
} as IUser;

const renderModal = (props: Partial<ComponentProps<typeof LessonDetailsModal>> = {}) => {
  const handlers = { onClose: vi.fn(), onLessonUpdated: vi.fn(), onEdit: vi.fn() };
  render(<LessonDetailsModal lesson={lesson} isOpen {...handlers} {...props} />);
  return handlers;
};

const statusOf = (name: string) =>
  screen.getByRole('group', { name: `Статус: ${name}` }).querySelector('[aria-pressed=true]')
    ?.textContent ?? null;

describe('LessonDetailsModal — відвідуваність', () => {
  it('перемикання статусу змінює лише рядок студента і не ходить у мережу', async () => {
    const adapter = installApi({ '/users': () => students, '/attendance': () => [] });
    renderModal();
    await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });
    const requestsBefore = adapter.mock.calls.length;

    await userEvent.click(screen.getAllByRole('button', { name: 'Відсутній' })[0]);

    expect(adapter.mock.calls.length).toBe(requestsBefore);
    expect(statusOf('Анна Коваленко')).toBe('Відсутній');
    expect(statusOf('Богдан Мельник')).toBeNull();
  });

  // Раніше всі невідмічені стартували «Присутніми» і проведення мовчки це записувало
  it('без збереженої явки нікого не відмічає, а «Всі присутні» відмічає лише невідмічених', async () => {
    installApi({ '/users': () => students, '/attendance': () => [] });
    renderModal();
    await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });

    expect(statusOf('Анна Коваленко')).toBeNull();
    expect(screen.getByText('2 студенти · не відмічено 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Позначити проведеним' })).toBeDisabled();

    await userEvent.click(screen.getAllByRole('button', { name: 'Відсутній' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Всі присутні' }));

    expect(statusOf('Анна Коваленко')).toBe('Відсутній');
    expect(statusOf('Богдан Мельник')).toBe('Присутній');
    expect(screen.queryByRole('button', { name: 'Всі присутні' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Позначити проведеним' })).toBeEnabled();
  });

  it('збережена явка підтягується у статуси', async () => {
    installApi({
      '/users': () => students,
      '/attendance': () => [{ studentId: 'student-2', status: AttendanceStatus.LATE, note: '' }],
    });
    renderModal();
    await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });

    expect(statusOf('Богдан Мельник')).toBe('Запізнився');
    expect(statusOf('Анна Коваленко')).toBeNull();
  });

  it('«Позначити проведеним» питає підтвердження з підсумком і лише тоді шле запит', async () => {
    const completed = { ...lesson, status: LessonStatus.COMPLETED };
    const adapter = installApi({
      '/users': () => students,
      '/attendance': () => [],
      'POST /lessons/lesson-1/complete': () => completed,
    });
    const { onClose, onLessonUpdated } = renderModal();
    await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });

    await userEvent.click(screen.getAllByRole('button', { name: 'Відсутній' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Всі присутні' }));
    await userEvent.click(screen.getByRole('button', { name: 'Позначити проведеним' }));

    const dialog = await screen.findByRole('alertdialog');
    const summary = within(dialog).getByRole('list', { name: 'Підсумок явки' });
    expect(within(summary).getByText('Присутній').nextSibling).toHaveTextContent('1');
    expect(within(summary).getByText('Відсутній').nextSibling).toHaveTextContent('1');
    expect(callsTo(adapter, 'POST', '/lessons/lesson-1/complete')).toHaveLength(0);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Позначити проведеним' }));

    await waitFor(() => expect(onLessonUpdated).toHaveBeenCalledWith(completed));
    expect(onClose).toHaveBeenCalled();
    const [completeRequest] = callsTo(adapter, 'POST', '/lessons/lesson-1/complete');
    expect(JSON.parse(completeRequest.data).records).toEqual([
      { studentId: 'student-1', status: 'absent', note: '' },
      { studentId: 'student-2', status: 'present', note: '' },
    ]);
  });

  it('збереження явки без проведення не чіпає розклад і шле лише відмічених', async () => {
    const adapter = installApi({
      '/users': () => students,
      '/attendance': () => [],
      'POST /attendance/bulk': () => [],
    });
    const { onClose, onLessonUpdated } = renderModal();
    await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });

    // Нікого не відмічено — зберігати нічого
    expect(screen.getByRole('button', { name: 'Зберегти явку' })).toBeDisabled();
    await userEvent.click(screen.getAllByRole('button', { name: 'Запізнився' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти явку' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onLessonUpdated).not.toHaveBeenCalled();
    const [request] = callsTo(adapter, 'POST', '/attendance/bulk');
    expect(JSON.parse(request.data).records).toEqual([
      { studentId: 'student-1', status: 'late', note: '' },
    ]);
  });
});

describe('LessonDetailsModal — керування заняттям', () => {
  it('«Скасувати заняття» після підтвердження віддає сторінці скасоване заняття', async () => {
    const cancelled = { ...lesson, status: LessonStatus.CANCELLED };
    const adapter = installApi({
      '/users': () => students,
      '/attendance': () => [],
      'DELETE /lessons/lesson-1': () => cancelled,
    });
    const { onClose, onLessonUpdated } = renderModal();
    await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });

    await userEvent.click(screen.getByRole('button', { name: 'Скасувати заняття' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('«Вступ до JS» для групи JS-1');

    // «Не скасовувати» закриває лише підтвердження
    await userEvent.click(within(dialog).getByRole('button', { name: 'Не скасовувати' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(callsTo(adapter, 'DELETE', '/lessons/lesson-1')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Скасувати заняття' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Скасувати заняття',
      })
    );

    await waitFor(() => expect(onLessonUpdated).toHaveBeenCalledWith(cancelled));
    expect(onClose).toHaveBeenCalled();
  });

  it('«Редагувати» передає заняття сторінці', async () => {
    installApi({ '/users': () => students, '/attendance': () => [] });
    const { onEdit } = renderModal();
    await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });

    await userEvent.click(screen.getByRole('button', { name: 'Редагувати' }));

    expect(onEdit).toHaveBeenCalledWith(lesson);
  });

  it('проведене заняття не можна редагувати чи скасувати, але явку виправити можна', async () => {
    installApi({ '/users': () => students, '/attendance': () => [] });
    renderModal({ lesson: { ...lesson, status: LessonStatus.COMPLETED } });
    await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });

    expect(screen.queryByRole('button', { name: 'Редагувати' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Скасувати заняття' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Позначити проведеним' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Зберегти явку' })).toBeInTheDocument();
  });

  it('скасоване заняття — лише для читання: без кнопок і перемикачів явки', async () => {
    installApi({ '/users': () => students, '/attendance': () => [] });
    renderModal({ lesson: { ...lesson, status: LessonStatus.CANCELLED } });
    await screen.findByText('Анна Коваленко');

    expect(screen.queryByRole('group', { name: /Статус:/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('Не відмічено')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Зберегти явку' })).not.toBeInTheDocument();
  });

  it('викладач чужого заняття бачить деталі без кнопок керування', async () => {
    useAuthStore.getState().setAuth({ ...teacher, id: 'teacher-2' }, 'token');
    installApi({ '/users': () => students, '/attendance': () => [] });
    renderModal();
    await screen.findByText('Анна Коваленко');

    expect(screen.queryByRole('button', { name: 'Скасувати заняття' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Редагувати' })).not.toBeInTheDocument();
  });
});
