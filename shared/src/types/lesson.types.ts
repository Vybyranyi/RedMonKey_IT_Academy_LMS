import type { LessonType, LessonStatus } from '../enums';

export interface ILessonBase {
  title: string;
  description: string;
  date: Date | string;
  duration: number;
  type: LessonType;
  status: LessonStatus;
  homeworkDescription?: string | null;
  homeworkDueDate?: Date | string | null;
}

export interface ILesson extends ILessonBase {
  id: string;
  academyId?: string;
  teacherId: string;
  groupId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IPopulatedLesson extends ILesson {
  teacher: { id: string; firstName: string; lastName: string; avatar?: string | null };
  group: { id: string; name: string };
}
