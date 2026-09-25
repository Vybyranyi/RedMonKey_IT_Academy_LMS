import { describe, expect, it } from 'vitest';
import { AttendanceStatus } from '../../enums';
import {
  bulkAttendanceSchema,
  completeLessonSchema,
  updateAttendanceSchema,
} from '../attendance.schema';
import { UUID, firstIssue } from './fixtures';

const bulk = {
  lessonId: UUID.lesson,
  records: [
    { studentId: UUID.student, status: AttendanceStatus.PRESENT },
    { studentId: UUID.otherStudent, status: AttendanceStatus.LATE },
  ],
};

describe('bulkAttendanceSchema', () => {
  it('приймає список записів', () => {
    expect(bulkAttendanceSchema.safeParse(bulk).success).toBe(true);
  });

  it('підставляє порожню примітку за замовчуванням', () => {
    expect(bulkAttendanceSchema.parse(bulk).records[0].note).toBe('');
  });

  it('відхиляє порожній список', () => {
    const result = bulkAttendanceSchema.safeParse({ ...bulk, records: [] });
    expect(firstIssue(result)).toBe('Потрібен непорожній масив records');
  });

  it('відхиляє повторюваний studentId', () => {
    const result = bulkAttendanceSchema.safeParse({
      ...bulk,
      records: [
        { studentId: UUID.student, status: AttendanceStatus.PRESENT },
        { studentId: UUID.student, status: AttendanceStatus.ABSENT },
      ],
    });
    expect(firstIssue(result)).toBe('У records є повторювані studentId');
  });

  // AttendanceStatus не має CHECK-обмеження в БД — enum у схемі і є тією перевіркою
  it('відхиляє невідомий статус явки', () => {
    const result = bulkAttendanceSchema.safeParse({
      ...bulk,
      records: [{ studentId: UUID.student, status: 'maybe' }],
    });
    expect(firstIssue(result)).toBe('Некоректний статус явки');
  });
});

describe('updateAttendanceSchema', () => {
  it('приймає зміну лише примітки', () => {
    expect(updateAttendanceSchema.safeParse({ note: 'Запізнився на 10 хв' }).success).toBe(true);
  });

  it('відхиляє порожнє тіло', () => {
    const result = updateAttendanceSchema.safeParse({});
    expect(firstIssue(result)).toBe('Не передано жодного поля для оновлення');
  });
});

describe('completeLessonSchema', () => {
  // Заняття можна закрити й без явки — тоді records порожній
  it('підставляє порожній список записів', () => {
    expect(completeLessonSchema.parse({}).records).toEqual([]);
  });

  it('приймає записи явки', () => {
    const result = completeLessonSchema.safeParse({
      records: [{ studentId: UUID.student, status: AttendanceStatus.EXCUSED }],
    });
    expect(result.success).toBe(true);
  });
});
