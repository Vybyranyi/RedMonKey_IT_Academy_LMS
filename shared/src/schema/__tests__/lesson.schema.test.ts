import { describe, expect, it } from 'vitest';
import { LessonType } from '../../enums';
import { createLessonSchema, lessonFiltersSchema, updateLessonSchema } from '../lesson.schema';
import { UUID, firstIssue } from './fixtures';

const validLesson = {
  title: 'Вступ до TypeScript',
  date: '2026-09-01T10:00:00Z',
  type: LessonType.LECTURE,
  groupId: UUID.group,
};

describe('createLessonSchema', () => {
  it('приймає мінімально необхідні поля', () => {
    expect(createLessonSchema.safeParse(validLesson).success).toBe(true);
  });

  it('підставляє опис і тривалість за замовчуванням', () => {
    const result = createLessonSchema.parse(validLesson);
    expect(result.description).toBe('');
    expect(result.duration).toBe(80);
  });

  it('відхиляє дату не в ISO-форматі', () => {
    const result = createLessonSchema.safeParse({ ...validLesson, date: '01.09.2026' });
    expect(firstIssue(result)).toBe('Некоректна дата заняття (очікується ISO-рядок)');
  });

  it.each([10, 500])('відхиляє тривалість поза межами: %i хв', (duration) => {
    expect(createLessonSchema.safeParse({ ...validLesson, duration }).success).toBe(false);
  });

  it('відхиляє закоротку назву', () => {
    const result = createLessonSchema.safeParse({ ...validLesson, title: 'TS' });
    expect(firstIssue(result)).toBe('Назва: не менше 3 символів');
  });

  it('відхиляє невідомий тип заняття', () => {
    const result = createLessonSchema.safeParse({ ...validLesson, type: 'webinar' });
    expect(firstIssue(result)).toBe('Некоректний тип заняття');
  });
});

describe('updateLessonSchema', () => {
  it('приймає зміну лише статусу', () => {
    expect(updateLessonSchema.safeParse({ status: 'completed' }).success).toBe(true);
  });

  it('відхиляє порожнє тіло', () => {
    const result = updateLessonSchema.safeParse({});
    expect(firstIssue(result)).toBe('Не передано жодного поля для оновлення');
  });
});

describe('lessonFiltersSchema', () => {
  // Календар шле короткий день (2026-09-01), а навігація по тижню — повний ISO
  it.each(['2026-09-01', '2026-09-01T00:00:00Z'])('приймає межу діапазону %s', (from) => {
    expect(lessonFiltersSchema.safeParse({ from }).success).toBe(true);
  });

  it('відхиляє некоректну межу діапазону', () => {
    expect(lessonFiltersSchema.safeParse({ to: 'вчора' }).success).toBe(false);
  });
});
