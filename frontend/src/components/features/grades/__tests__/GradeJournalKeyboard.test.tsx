import type { IPopulatedLesson, IUser } from '@redmonkey/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GradeJournal from '../GradeJournal';

// Окремий файл: у GradeJournal.test.tsx клітинки замокані для підрахунку рендерів
const students = [
  { id: 'student-1', firstName: 'Анна', lastName: 'Коваленко' },
  { id: 'student-2', firstName: 'Богдан', lastName: 'Мельник' },
  { id: 'student-3', firstName: 'Віра', lastName: 'Шевчук' },
] as IUser[];

const lessons = [
  { id: 'lesson-1', title: 'Вступ', date: '2026-09-01T10:00:00.000Z' },
  { id: 'lesson-2', title: 'Типи', date: '2026-09-03T10:00:00.000Z' },
] as IPopulatedLesson[];

describe('GradeJournal — оцінки з клавіатури', () => {
  it('Enter зберігає й відкриває клітинку наступного студента в тому ж занятті', async () => {
    const onSaveGrade = vi.fn();
    const user = userEvent.setup();
    render(
      <GradeJournal
        students={students}
        lessons={lessons}
        grades={[]}
        isLoading={false}
        canEdit
        onSaveGrade={onSaveGrade}
        onDeleteGrade={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Анна Коваленко.*Типи.*виставити/ }));
    await user.type(await screen.findByLabelText(/Оцінка/), '10{Enter}');
    // Попап наступного рядка вже відкритий, фокус у полі — друкуємо одразу
    await user.type(await screen.findByLabelText(/Оцінка/), '8{Enter}');
    await user.type(await screen.findByLabelText(/Оцінка/), '12{Enter}');

    const saved = onSaveGrade.mock.calls.map(([student, lesson, , value]) => [
      student.firstName,
      lesson.title,
      value,
    ]);
    expect(saved).toEqual([
      ['Анна', 'Типи', 10],
      ['Богдан', 'Типи', 8],
      ['Віра', 'Типи', 12],
    ]);
    // Після останнього рядка попап просто закривається
    expect(screen.queryByLabelText(/Оцінка/)).not.toBeInTheDocument();
  });
});
