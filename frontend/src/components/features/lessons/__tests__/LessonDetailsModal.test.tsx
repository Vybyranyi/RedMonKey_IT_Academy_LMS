import { LessonStatus, LessonType, UserRole } from '@redmonkey/shared';
import type { IPopulatedLesson, IUser } from '@redmonkey/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../../../store/authStore';
import { installApi } from '../../../../test/apiMock';
import LessonDetailsModal from '../LessonDetailsModal';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const admin = { id: 'admin-1', role: UserRole.ADMIN, firstName: 'Ірина', lastName: 'Адміненко' } as IUser;

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

describe('LessonDetailsModal — відвідуваність', () => {
  it('перемикання статусу змінює лише рядок студента і не ходить у мережу', async () => {
    const adapter = installApi({ '/users': () => students, '/attendance': () => [] });
    render(<LessonDetailsModal lesson={lesson} isOpen onClose={vi.fn()} onLessonUpdated={vi.fn()} />);
    const annaStatus = await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });
    const requestsBefore = adapter.mock.calls.length;

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Відсутній' })[0]
    );

    expect(adapter.mock.calls.length).toBe(requestsBefore);
    expect(annaStatus.querySelector('[aria-pressed=true]')?.textContent).toBe('Відсутній');
    expect(
      screen.getByRole('group', { name: 'Статус: Богдан Мельник' }).querySelector('[aria-pressed=true]')
        ?.textContent
    ).toBe('Присутній');
  });

  // Раніше після збереження SchedulePage перечитував увесь календар
  it('«Позначити проведеним» віддає сторінці оновлене заняття з відповіді сервера', async () => {
    const completed = { ...lesson, status: LessonStatus.COMPLETED };
    const adapter = installApi({
      '/users': () => students,
      '/attendance': () => [],
      'POST /lessons/lesson-1/complete': () => completed,
    });
    const onLessonUpdated = vi.fn();
    const onClose = vi.fn();
    render(<LessonDetailsModal lesson={lesson} isOpen onClose={onClose} onLessonUpdated={onLessonUpdated} />);
    await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });

    await userEvent.click(screen.getAllByRole('button', { name: 'Відсутній' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Позначити проведеним' }));

    await waitFor(() => expect(onLessonUpdated).toHaveBeenCalledWith(completed));
    expect(onClose).toHaveBeenCalled();
    const [completeRequest] = adapter.mock.calls
      .map(([config]) => config)
      .filter((config) => config.method === 'post');
    expect(JSON.parse(completeRequest.data).records).toEqual([
      { studentId: 'student-1', status: 'absent', note: '' },
      { studentId: 'student-2', status: 'present', note: '' },
    ]);
  });

  it('збереження явки без проведення не чіпає розклад', async () => {
    installApi({
      '/users': () => students,
      '/attendance': () => [],
      'POST /attendance/bulk': () => [],
    });
    const onLessonUpdated = vi.fn();
    const onClose = vi.fn();
    render(<LessonDetailsModal lesson={lesson} isOpen onClose={onClose} onLessonUpdated={onLessonUpdated} />);
    await screen.findByRole('group', { name: 'Статус: Анна Коваленко' });

    await userEvent.click(screen.getByRole('button', { name: 'Зберегти явку' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onLessonUpdated).not.toHaveBeenCalled();
  });
});
