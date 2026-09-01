import { AttendanceStatus } from '@redmonkey/shared';

export interface AttendanceStatusMeta {
  label: string;
  active: string;   // класи вибраної кнопки
  badge: string;    // класи бейджа у режимі читання
}

export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, AttendanceStatusMeta> = {
  [AttendanceStatus.PRESENT]: {
    label: 'Присутній',
    active: 'bg-emerald-600 text-white border-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [AttendanceStatus.LATE]: {
    label: 'Запізнився',
    active: 'bg-amber-500 text-white border-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  [AttendanceStatus.ABSENT]: {
    label: 'Відсутній',
    active: 'bg-[#C10000] text-white border-[#C10000]',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
  [AttendanceStatus.EXCUSED]: {
    label: 'Поважна причина',
    active: 'bg-slate-600 text-white border-slate-600',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};
