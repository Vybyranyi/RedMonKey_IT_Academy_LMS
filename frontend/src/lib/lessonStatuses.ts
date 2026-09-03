import { LessonStatus } from '@redmonkey/shared';

export interface LessonStatusMeta {
  label: string;
  badge: string;  // класи бейджа статусу
}

export const LESSON_STATUS_META: Record<LessonStatus, LessonStatusMeta> = {
  [LessonStatus.SCHEDULED]: {
    label: 'Заплановано',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [LessonStatus.COMPLETED]: {
    label: 'Проведено',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [LessonStatus.CANCELLED]: {
    label: 'Скасовано',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
};
