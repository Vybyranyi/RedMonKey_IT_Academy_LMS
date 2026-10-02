import { LessonStatus, LessonType, UserRole } from '@redmonkey/shared';
import type { IPopulatedLesson, IUser } from '@redmonkey/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { installApi } from '../../test/apiMock';
import DashboardPage from '../DashboardPage';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

const teacher = {
  id: 'teacher-1',
  role: UserRole.TEACHER,
  firstName: 'Олег',
  lastName: 'Петренко',
} as IUser;

const at = (dayOffset: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const lesson = (id: string, title: string, date: string, status = LessonStatus.SCHEDULED) =>
  ({
    id,
    title,
    date,
    duration: 80,
    type: LessonType.LECTURE,
    status,
    groupId: 'group-1',
    teacherId: 'teacher-1',
    group: { id: 'group-1', name: 'JS-1' },
    teacher: { id: 'teacher-1', firstName: 'Олег', lastName: 'Петренко' },
  }) as IPopulatedLesson;

function ScheduleProbe() {
  const { search } = useLocation();
  return <p>Розклад {search}</p>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/schedule" element={<ScheduleProbe />} />
      </Routes>
    </MemoryRouter>
  );

const listTitled = (title: string) =>
  screen.getByText(title).closest('[data-slot=card]') as HTMLElement;

beforeEach(() => {
  useAuthStore.getState().setAuth(teacher, 'token');
});

describe('DashboardPage — заняття', () => {
  // Сьогоднішнє заняття о 23:00 гарантовано ще попереду, тож воно і «сьогодні», і «найближче»
  const today = lesson('lesson-today', 'Сьогоднішня лекція', at(0, 23));
  const cancelled = lesson(
    'lesson-cancelled',
    'Скасована лекція',
    at(0, 23),
    LessonStatus.CANCELLED
  );

  const setup = () =>
    installApi({
      '/lessons': () => [today, cancelled],
      '/groups': () => [],
      '/coins/leaderboard': () => [],
    });

  it('клік по заняттю відкриває розклад на його тижні з відкритими деталями', async () => {
    setup();
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /Сьогоднішня лекція/ }));

    const date = new Date(today.date);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    expect(screen.getByText(`Розклад ?date=${day}&lesson=lesson-today`)).toBeInTheDocument();
  });

  it('сьогоднішнє заняття не дублюється в «Далі цього тижня», скасованого немає ніде', async () => {
    setup();
    renderPage();
    await screen.findByRole('button', { name: /Сьогоднішня лекція/ });

    expect(
      within(listTitled('Сьогоднішні заняття')).getByText('Сьогоднішня лекція')
    ).toBeInTheDocument();
    expect(within(listTitled('Далі цього тижня')).queryByText('Сьогоднішня лекція')).toBeNull();
    expect(screen.queryByText('Скасована лекція')).not.toBeInTheDocument();
  });
});
