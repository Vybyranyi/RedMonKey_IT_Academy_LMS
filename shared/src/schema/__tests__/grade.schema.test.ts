import { describe, expect, it } from 'vitest';
import { GradeType } from '../../enums';
import {
  GRADE_MAX,
  GRADE_MIN,
  bulkGradeSchema,
  createGradeSchema,
  gradeSummaryFiltersSchema,
  updateGradeSchema,
} from '../grade.schema';
import { UUID, firstIssue } from './fixtures';

const validGrade = {
  studentId: UUID.student,
  lessonId: UUID.lesson,
  value: 10,
  type: GradeType.HOMEWORK,
};

describe('createGradeSchema', () => {
  it('приймає коректну оцінку', () => {
    const result = createGradeSchema.safeParse(validGrade);
    expect(result.success).toBe(true);
  });

  it('коментар необовʼязковий', () => {
    expect(createGradeSchema.safeParse({ ...validGrade, comment: 'Добре' }).success).toBe(true);
  });

  // Діапазон 1..12 не описаний CHECK-обмеженням у БД — схема і є тією перевіркою
  it.each([GRADE_MIN, 6, GRADE_MAX])('приймає значення %i', (value) => {
    expect(createGradeSchema.safeParse({ ...validGrade, value }).success).toBe(true);
  });

  it.each([0, GRADE_MAX + 1, -3])('відхиляє значення поза діапазоном: %i', (value) => {
    expect(createGradeSchema.safeParse({ ...validGrade, value }).success).toBe(false);
  });

  it('відхиляє дробову оцінку', () => {
    const result = createGradeSchema.safeParse({ ...validGrade, value: 9.5 });
    expect(firstIssue(result)).toBe('Оцінка має бути цілим числом');
  });

  it('відхиляє некоректний studentId', () => {
    const result = createGradeSchema.safeParse({ ...validGrade, studentId: 'not-a-uuid' });
    expect(firstIssue(result)).toBe('studentId має бути UUID');
  });

  it('відхиляє невідомий тип оцінки', () => {
    const result = createGradeSchema.safeParse({ ...validGrade, type: 'quiz' });
    expect(firstIssue(result)).toBe('Некоректний тип оцінки');
  });

  it('відхиляє задовгий коментар', () => {
    const result = createGradeSchema.safeParse({ ...validGrade, comment: 'a'.repeat(201) });
    expect(firstIssue(result)).toBe('Коментар задовгий (максимум 200 символів)');
  });
});

describe('updateGradeSchema', () => {
  it('приймає часткове оновлення', () => {
    expect(updateGradeSchema.safeParse({ value: 8 }).success).toBe(true);
  });

  it('відхиляє порожнє тіло — інакше PATCH нічого не змінює', () => {
    const result = updateGradeSchema.safeParse({});
    expect(firstIssue(result)).toBe('Не передано жодного поля для оновлення');
  });
});

describe('bulkGradeSchema', () => {
  const bulk = {
    lessonId: UUID.lesson,
    type: GradeType.CLASSWORK,
    grades: [
      { studentId: UUID.student, value: 11 },
      { studentId: UUID.otherStudent, value: 7 },
    ],
  };

  it('приймає список оцінок', () => {
    expect(bulkGradeSchema.safeParse(bulk).success).toBe(true);
  });

  it('відхиляє порожній список', () => {
    const result = bulkGradeSchema.safeParse({ ...bulk, grades: [] });
    expect(firstIssue(result)).toBe('Потрібен непорожній масив grades');
  });

  // Дубль у списку означав би дві різні оцінки одному студенту за одне заняття
  it('відхиляє повторюваний studentId', () => {
    const result = bulkGradeSchema.safeParse({
      ...bulk,
      grades: [
        { studentId: UUID.student, value: 11 },
        { studentId: UUID.student, value: 5 },
      ],
    });
    expect(firstIssue(result)).toBe('У grades є повторювані studentId');
  });

  it('відхиляє оцінку поза діапазоном усередині списку', () => {
    const result = bulkGradeSchema.safeParse({
      ...bulk,
      grades: [{ studentId: UUID.student, value: 13 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('gradeSummaryFiltersSchema', () => {
  it('вимагає groupId', () => {
    expect(gradeSummaryFiltersSchema.safeParse({}).success).toBe(false);
  });

  it('приймає groupId без типу', () => {
    expect(gradeSummaryFiltersSchema.safeParse({ groupId: UUID.group }).success).toBe(true);
  });
});
