import { LessonStatus, type IPopulatedLesson } from '@redmonkey/shared';
import { describe, expect, it } from 'vitest';
import {
  ALL_PERIODS,
  defaultPeriod,
  journalLessons,
  journalMonths,
  lessonsInPeriod,
} from '../journalPeriods';

const lesson = (id: string, date: string, status = LessonStatus.SCHEDULED) =>
  ({ id, date, status }) as IPopulatedLesson;

const lessons = [
  lesson('sep-1', '2026-09-01T10:00:00'),
  lesson('oct-1', '2026-10-05T10:00:00'),
  lesson('sep-2', '2026-09-20T10:00:00'),
  lesson('oct-cancelled', '2026-10-07T10:00:00', LessonStatus.CANCELLED),
];

describe('journalPeriods', () => {
  it('скасовані заняття в журнал не потрапляють', () => {
    expect(journalLessons(lessons).map((item) => item.id)).toEqual(['sep-1', 'oct-1', 'sep-2']);
  });

  it('місяці — унікальні, від ранніх до пізніх, з українською назвою', () => {
    expect(journalMonths(journalLessons(lessons))).toEqual([
      { key: '2026-09', label: 'Вересень 2026' },
      { key: '2026-10', label: 'Жовтень 2026' },
    ]);
  });

  it('за замовчуванням — поточний місяць, якщо в ньому є заняття, інакше весь курс', () => {
    const months = journalMonths(lessons);
    expect(defaultPeriod(months, new Date('2026-10-15T12:00:00'))).toBe('2026-10');
    expect(defaultPeriod(months, new Date('2026-12-01T12:00:00'))).toBe(ALL_PERIODS);
  });

  it('фільтрує заняття за місяцем', () => {
    expect(lessonsInPeriod(lessons, '2026-09').map((item) => item.id)).toEqual(['sep-1', 'sep-2']);
    expect(lessonsInPeriod(lessons, ALL_PERIODS)).toHaveLength(4);
  });
});
