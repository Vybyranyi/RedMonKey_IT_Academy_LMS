import { z } from 'zod';
import { GradeType } from '../enums';

export const GRADE_MIN = 1;
export const GRADE_MAX = 12;

// У БД немає CHECK-обмеження на 1..12 (Prisma не вміє їх декларувати),
// тож ця схема — єдине місце, де діапазон реально перевіряється.
const value = z
  .number({ error: 'Оцінка має бути числом' })
  .int('Оцінка має бути цілим числом')
  .min(GRADE_MIN, `Оцінка не може бути меншою за ${GRADE_MIN}`)
  .max(GRADE_MAX, `Оцінка не може бути більшою за ${GRADE_MAX}`);

const type = z.enum(GradeType, { error: 'Некоректний тип оцінки' });

const comment = z
  .string({ error: 'Коментар має бути рядком' })
  .trim()
  .max(200, 'Коментар задовгий (максимум 200 символів)');

const studentId = z.uuid('studentId має бути UUID');
const lessonId = z.uuid('lessonId має бути UUID');
const groupId = z.uuid('groupId має бути UUID');

export const createGradeSchema = z.object({
  studentId,
  lessonId,
  value,
  type,
  comment: comment.optional(),
});

/**
 * PATCH описуємо окремо, а НЕ через createGradeSchema.partial():
 * .partial() не знімає .default(), і в майбутньому це мовчки затирало б поля.
 * studentId і lessonId у PATCH не приймаємо — перенести оцінку на іншого
 * студента чи інше заняття означає видалити її й виставити заново.
 */
export const updateGradeSchema = z
  .object({
    value: value.optional(),
    type: type.optional(),
    comment: comment.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Не передано жодного поля для оновлення',
  });

/** Масове виставлення: один тип оцінки за одне заняття для списку студентів. */
export const bulkGradeSchema = z
  .object({
    lessonId,
    type,
    grades: z
      .array(
        z.object({ studentId, value, comment: comment.optional() }),
        { error: 'grades має бути масивом' }
      )
      .min(1, 'Потрібен непорожній масив grades')
      .max(100, 'Забагато оцінок за один раз'),
  })
  .refine(
    (data) => new Set(data.grades.map((grade) => grade.studentId)).size === data.grades.length,
    { message: 'У grades є повторювані studentId', path: ['grades'] }
  );

export const gradeFiltersSchema = z.object({
  studentId: studentId.optional(),
  lessonId: lessonId.optional(),
  groupId: groupId.optional(),
  type: type.optional(),
});

/** Для журналу групи середні рахуються завжди в межах однієї групи. */
export const gradeSummaryFiltersSchema = z.object({
  groupId,
  type: type.optional(),
});

export type IGradeDto = z.infer<typeof createGradeSchema>;
export type IUpdateGradeDto = z.infer<typeof updateGradeSchema>;
export type IBulkGradeDto = z.infer<typeof bulkGradeSchema>;
export type IGradeFilters = z.infer<typeof gradeFiltersSchema>;
export type IGradeSummaryFilters = z.infer<typeof gradeSummaryFiltersSchema>;
