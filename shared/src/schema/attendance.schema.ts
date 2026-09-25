import { z } from 'zod';
import { AttendanceStatus } from '../enums';

const note = z.string({ error: 'Примітка має бути рядком' }).trim().max(500, 'Примітка задовга');

export const attendanceRecordSchema = z.object({
  studentId: z.uuid('studentId має бути UUID'),
  // AttendanceStatus не має CHECK-обмеження в БД — enum у схемі і є тією перевіркою
  status: z.enum(AttendanceStatus, { error: 'Некоректний статус явки' }),
  note: note.default(''),
});

export const bulkAttendanceSchema = z
  .object({
    lessonId: z.uuid('lessonId має бути UUID'),
    records: z
      .array(attendanceRecordSchema, { error: 'records має бути масивом' })
      .min(1, 'Потрібен непорожній масив records')
      .max(200, 'Забагато записів за один раз'),
  })
  .refine((data) => new Set(data.records.map((r) => r.studentId)).size === data.records.length, {
    message: 'У records є повторювані studentId',
    path: ['records'],
  });

/** PATCH одного запису: обидва поля опційні, але не обидва відсутні. */
export const updateAttendanceSchema = z
  .object({
    status: z.enum(AttendanceStatus, { error: 'Некоректний статус явки' }).optional(),
    note: note.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Не передано жодного поля для оновлення',
  });

/** POST /lessons/:id/complete — lessonId береться з URL, у тілі лише records. */
export const completeLessonSchema = z.object({
  records: z
    .array(attendanceRecordSchema, { error: 'records має бути масивом' })
    .max(200)
    .default([]),
});

/**
 * GET /attendance. Що хоча б один фільтр є, перевіряє сервіс: студенту
 * studentId підставляється сам, і для нього порожній query теж коректний.
 */
export const attendanceFiltersSchema = z.object({
  lessonId: z.uuid('lessonId має бути UUID').optional(),
  studentId: z.uuid('studentId має бути UUID').optional(),
});

export type IAttendanceRecordDto = z.infer<typeof attendanceRecordSchema>;
export type IAttendanceFilters = z.infer<typeof attendanceFiltersSchema>;
export type IBulkAttendanceDto = z.infer<typeof bulkAttendanceSchema>;
export type IUpdateAttendanceDto = z.infer<typeof updateAttendanceSchema>;
