import { UserRole } from '@redmonkey/shared';
import type { IStudentListStats, IUserWithListStats } from '@redmonkey/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StudentTable from '../StudentTable';

const student = (stats: IStudentListStats | null): IUserWithListStats => ({
  id: 'student-1',
  firstName: 'Анна',
  lastName: 'Коваленко',
  email: 'anna@academy.ua',
  role: UserRole.STUDENT,
  redCoins: 40,
  isActive: true,
  group: { id: 'group-1', name: 'JS-1' },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  stats,
});

/** Клітинки рядка в порядку колонок: Студент, Група, Середній бал, RedCoins, Відвідуваність… */
const renderRow = (stats: IStudentListStats | null) => {
  render(<StudentTable students={[student(stats)]} onViewDetails={vi.fn()} />);
  const row = screen.getByText('Анна Коваленко').closest('tr')!;
  const cells = within(row).getAllByRole('cell');
  return { average: cells[2]!, attendance: cells[4]! };
};

describe('StudentTable — бал і відвідуваність', () => {
  it('показує справжні середній бал і відвідуваність студента', () => {
    const { average, attendance } = renderRow({ averageGrade: 8.67, attendanceRate: 90 });

    expect(average).toHaveTextContent('8.7');
    // Колір середнього — за тією ж шкалою, що й оцінки: 7–9 синій
    expect(within(average).getByText('8.7')).toHaveClass('bg-blue-100');
    expect(attendance).toHaveTextContent('90%');
  });

  // Раніше тут був 0 у червоній плашці — як у двієчника
  it('студент без оцінок і явки — «—», а не нуль у червоному', () => {
    const { average, attendance } = renderRow({ averageGrade: null, attendanceRate: null });

    const averageBadge = within(average).getByText('—');
    expect(averageBadge).not.toHaveClass('bg-rose-100');
    expect(averageBadge).toHaveAttribute('title', 'Оцінок ще немає');
    expect(average).not.toHaveTextContent('0');
    expect(within(attendance).getByText('—')).toBeInTheDocument();
    expect(attendance).not.toHaveTextContent('%');
  });

  it('нульова відвідуваність — це справжні 0%, а не «—»', () => {
    const { attendance } = renderRow({ averageGrade: 3, attendanceRate: 0 });

    expect(attendance).toHaveTextContent('0%');
  });

  it('студенту чужої групи пояснює, чому статистики немає', () => {
    const { average, attendance } = renderRow(null);

    const hint = 'Статистика доступна лише для студентів ваших груп';
    expect(within(average).getByText('—')).toHaveAttribute('title', hint);
    expect(within(attendance).getByTitle(hint)).toHaveTextContent('—');
  });
});
