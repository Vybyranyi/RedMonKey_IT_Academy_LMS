
import { LessonType } from '@redmonkey/shared';

export interface LessonTypeMeta {
  label: string;
  dot: string;    // крапка в легенді
  event: string;  // плашка заняття в календарі
}

export const LESSON_TYPE_META: Record<LessonType, LessonTypeMeta> = {
  [LessonType.LECTURE]: {
    label: 'Лекція',
    dot: 'bg-blue-500',
    event: 'bg-blue-50 border-l-4 border-l-blue-500 text-blue-700',
  },
  [LessonType.PRACTICE]: {
    label: 'Практика',
    dot: 'bg-emerald-500',
    event: 'bg-emerald-50 border-l-4 border-l-emerald-500 text-emerald-700',
  },
  [LessonType.EXAM]: {
    label: 'Іспит',
    dot: 'bg-[#C10000]',
    event: 'bg-red-50 border-l-4 border-l-[#C10000] text-red-700',
  },
  [LessonType.CONSULTATION]: {
    label: 'Консультація',
    dot: 'bg-slate-400',
    event: 'bg-slate-100 border-l-4 border-l-slate-400 text-slate-700',
  },
};
