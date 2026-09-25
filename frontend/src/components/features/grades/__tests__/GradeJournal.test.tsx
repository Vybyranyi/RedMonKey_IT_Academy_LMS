import { GradeType } from '@redmonkey/shared';
import type { IPopulatedGrade, IPopulatedLesson, IUser } from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GradeJournal from '../GradeJournal';
import GradeCell from '../GradeCell';

// Рахуємо рендери клітинок: саме їх має не зачіпати зміна в чужому рядку
vi.mock('../GradeCell', () => ({ default: vi.fn(() => null) }));

const students = [
  { id: 'student-1', firstName: 'Анна', lastName: 'Коваленко' },
  { id: 'student-2', firstName: 'Богдан', lastName: 'Мельник' },
] as IUser[];

const lessons = [
  { id: 'lesson-1', title: 'Вступ', date: '2026-09-01T10:00:00.000Z' },
  { id: 'lesson-2', title: 'Типи', date: '2026-09-03T10:00:00.000Z' },
] as IPopulatedLesson[];

const grade = (studentId: string, lessonId: string, value: number) =>
  ({
    id: `${studentId}:${lessonId}`,
    studentId,
    lessonId,
    value,
    type: GradeType.CLASSWORK,
  }) as IPopulatedGrade;

const initialGrades = [
  grade('student-1', 'lesson-1', 8),
  grade('student-1', 'lesson-2', 10),
  grade('student-2', 'lesson-1', 6),
];

const renderJournal = (
  grades: IPopulatedGrade[],
  handlers = { onSaveGrade: vi.fn(), onDeleteGrade: vi.fn() }
) => (
  <GradeJournal
    students={students}
    lessons={lessons}
    grades={grades}
    isLoading={false}
    canEdit
    {...handlers}
  />
);

const renderedStudentIds = () =>
  vi.mocked(GradeCell).mock.calls.map(([props]) => props.grade?.studentId ?? 'empty');

beforeEach(() => {
  vi.mocked(GradeCell).mockClear();
});

describe('GradeJournal — мемоізація рядків', () => {
  it('зміна оцінки перемальовує лише рядок цього студента', () => {
    const handlers = { onSaveGrade: vi.fn(), onDeleteGrade: vi.fn() };
    const { rerender } = render(renderJournal(initialGrades, handlers));
    vi.mocked(GradeCell).mockClear();

    // Так оновлює стан GradesPage: новий масив, але незмінені оцінки — ті самі об'єкти
    const updated = initialGrades.map((item) =>
      item.id === 'student-2:lesson-1' ? { ...item, value: 11 } : item
    );
    rerender(renderJournal(updated, handlers));

    // Дві клітинки рядка student-2 (одна з оцінкою, друга порожня); рядок student-1 не чіпали
    expect(renderedStudentIds()).toEqual(['student-2', 'empty']);
  });

  it('середнє перераховується з оцінок без запиту зведення', () => {
    const handlers = { onSaveGrade: vi.fn(), onDeleteGrade: vi.fn() };
    const { rerender } = render(renderJournal(initialGrades, handlers));

    expect(screen.getByText('9.0')).toBeInTheDocument();
    expect(screen.getByText('6.0')).toBeInTheDocument();

    rerender(renderJournal([...initialGrades, grade('student-2', 'lesson-2', 12)], handlers));

    // student-2: (6 + 12) / 2 — тепер обидва рядки мають 9.0
    expect(screen.getAllByText('9.0')).toHaveLength(2);
    expect(screen.queryByText('6.0')).not.toBeInTheDocument();
  });
});
