import { GradeType } from '@redmonkey/shared';

export interface GradeTypeMeta {
  label: string;
}

export const GRADE_TYPE_META: Record<GradeType, GradeTypeMeta> = {
  [GradeType.CLASSWORK]: { label: 'Класна робота' },
  [GradeType.HOMEWORK]: { label: 'Домашня робота' },
  [GradeType.EXAM]: { label: 'Іспит' },
  [GradeType.PROJECT]: { label: 'Проєкт' },
};

/** Кольорове кодування оцінок із ТЗ 6.2: 10–12 зелений, 7–9 синій, 4–6 жовтий, 1–3 червоний. */
export const getGradeColor = (value: number): string => {
  if (value >= 10) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (value >= 7) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (value >= 4) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-rose-100 text-rose-700 border-rose-200';
};

/** average === null означає «оцінок ще немає» — це не те саме, що нуль. */
export const getAverageColor = (average: number | null): string =>
  average === null
    ? 'bg-slate-100 text-slate-400 border-slate-200'
    : getGradeColor(Math.round(average));
