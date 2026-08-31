import { z } from "zod";
import { LessonStatus, LessonType } from "../enums";

const title = z
  .string({ error: "Назва має бути рядком" })
  .trim()
  .min(3, "Назва: не менше 3 символів")
  .max(120, "Назва: не більше 120 символів");

const description = z
  .string({ error: "Опис має бути рядком" })
  .trim()
  .max(2000, "Опис задовгий");

const date = z.iso.datetime({
  offset: true,
  error: "Некоректна дата заняття (очікується ISO-рядок)",
});

const duration = z
  .number({ error: "Тривалість має бути числом" })
  .int("Тривалість має бути цілим числом")
  .min(15, "Заняття не може бути коротшим за 15 хвилин")
  .max(480, "Заняття не може бути довшим за 480 хвилин");

const type = z.enum(LessonType, { error: "Некоректний тип заняття" });
const status = z.enum(LessonStatus, { error: "Некоректний статус заняття" });
const groupId = z.uuid("groupId має бути UUID");
const teacherId = z.uuid("teacherId має бути UUID");

const isoDay = z.union([z.iso.date(), z.iso.datetime({ offset: true })], {
  error: "Очікується дата у форматі 2026-08-01 або ISO-рядок",
});

export const createLessonSchema = z.object({
  title,
  description: description.default(""),
  date,
  duration: duration.default(80),
  type,
  groupId,
  teacherId: teacherId.optional(),
});

export const updateLessonSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    date: date.optional(),
    duration: duration.optional(),
    type: type.optional(),
    status: status.optional(),
    groupId: groupId.optional(),
    teacherId: teacherId.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Не передано жодного поля для оновлення",
  });

export const lessonFiltersSchema = z.object({
  groupId: groupId.optional(),
  teacherId: teacherId.optional(),
  from: isoDay.optional(),
  to: isoDay.optional(),
});






export type ILessonDto = z.infer<typeof createLessonSchema>;
export type IUpdateLessonDto = z.infer<typeof updateLessonSchema>;
export type ILessonFilters = z.infer<typeof lessonFiltersSchema>;
