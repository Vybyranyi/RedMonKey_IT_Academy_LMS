import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { LessonStatus, type IPopulatedLesson } from '@redmonkey/shared';

/** Значення фільтра «весь курс» — без нього журнал за рік мав би сотню колонок. */
export const ALL_PERIODS = 'all';

export interface JournalMonth {
  /** 2026-09 */
  key: string;
  /** «Вересень 2026» */
  label: string;
}

const monthKey = (date: string | Date) => format(new Date(date), 'yyyy-MM');

/** Скасоване заняття не проводилось — колонка під нього в журналі зайва. */
export const journalLessons = (lessons: IPopulatedLesson[]) =>
  lessons.filter((lesson) => lesson.status !== LessonStatus.CANCELLED);

/** Місяці, у яких у групи є заняття, від ранніх до пізніх. */
export const journalMonths = (lessons: IPopulatedLesson[]): JournalMonth[] => {
  const keys = [...new Set(lessons.map((lesson) => monthKey(lesson.date)))].sort();
  return keys.map((key) => {
    const label = format(new Date(`${key}-01T00:00:00`), 'LLLL yyyy', { locale: uk });
    return { key, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });
};

/** Поточний місяць, якщо в ньому є заняття; інакше — увесь курс. */
export const defaultPeriod = (months: JournalMonth[], now = new Date()) =>
  months.some((month) => month.key === monthKey(now)) ? monthKey(now) : ALL_PERIODS;

export const lessonsInPeriod = (lessons: IPopulatedLesson[], period: string) =>
  period === ALL_PERIODS ? lessons : lessons.filter((lesson) => monthKey(lesson.date) === period);
