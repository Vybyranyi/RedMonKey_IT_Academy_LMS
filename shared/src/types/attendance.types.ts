import type { AttendanceStatus } from '../enums';

export interface IAttendance {
  id: string;
  lessonId: string;
  studentId: string;
  status: AttendanceStatus;
  note: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IPopulatedAttendance extends IAttendance {
  student: { id: string; firstName: string; lastName: string; avatar?: string | null };
}
