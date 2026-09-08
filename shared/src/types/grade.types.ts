import type { GradeType } from '../enums';

export interface IGradeBase {
  value: number;
  type: GradeType;
  comment?: string | null;
}

export interface IGrade extends IGradeBase {
  id: string;
  academyId?: string;
  studentId: string;
  lessonId: string;
  teacherId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Те, що реально повертає API: оцінка разом зі студентом, заняттям і автором. */
export interface IPopulatedGrade extends IGrade {
  student: { id: string; firstName: string; lastName: string; avatar?: string | null };
  lesson: { id: string; title: string; date: Date | string };
  teacher: { id: string; firstName: string; lastName: string };
}

/**
 * Рядок таблиці середніх балів для журналу.
 * average === null означає, що оцінок ще немає — це не те саме, що 0.
 */
export interface IGradeSummaryRow {
  studentId: string;
  firstName: string;
  lastName: string;
  average: number | null;
  count: number;
}
