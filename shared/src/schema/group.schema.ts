import { z } from 'zod';
import { emptyToNull, hasAnyField } from './fields';

/**
 * Адмінське керування групами: POST /groups і PATCH /groups/:id.
 * Ключі поза переліком (id, academyId, isActive, students...) відкидаються —
 * склад студентів змінюється через users.group_id, а не через тіло групи.
 */

const name = z
  .string({ error: 'Потрібно вказати назву групи' })
  .trim()
  .min(3, 'Назва групи має містити не менше 3 символів')
  .max(100, 'Назва групи не може бути довшою за 100 символів');

const description = z
  .string({ error: 'Опис групи має бути рядком' })
  .trim()
  .max(500, 'Опис групи не може бути довшим за 500 символів');

/**
 * Форма шле '' для незаповненої дати і 'YYYY-MM-DD' з <input type="date">.
 * Prisma не приймає ні те, ні інше, тож тут '' стає null, а рядок — Date.
 */
const dateField = (label: string) =>
  z.preprocess(emptyToNull, z.coerce.date({ error: `${label}: некоректна дата` }).nullable());

const teachers = z
  .array(z.uuid('teachers: кожен елемент має бути UUID викладача'), {
    error: 'teachers має бути масивом',
  })
  .max(50, 'Забагато викладачів для однієї групи')
  .refine((ids) => new Set(ids).size === ids.length, 'У teachers є повторювані id');

/**
 * Перевіряється лише тоді, коли обидві дати прийшли в одному запиті:
 * порівняння з датою, що вже лежить у БД, — справа сервісу, а не схеми.
 */
const endsAfterStart = (data: { startDate?: Date | null; endDate?: Date | null }) =>
  !data.startDate || !data.endDate || data.endDate > data.startDate;

const endsAfterStartIssue = {
  message: 'Дата завершення має бути пізніше за дату початку',
  path: ['endDate'],
};

export const createGroupSchema = z
  .object({
    name,
    description: description.optional(),
    startDate: dateField('Дата початку').optional(),
    endDate: dateField('Дата завершення').optional(),
    teachers: teachers.default([]),
  })
  .refine(endsAfterStart, endsAfterStartIssue);

export const updateGroupSchema = z
  .object({
    name: name.optional(),
    description: description.optional(),
    startDate: dateField('Дата початку').optional(),
    endDate: dateField('Дата завершення').optional(),
    // Якщо передано — повністю замінює склад викладачів групи
    teachers: teachers.optional(),
  })
  .refine(hasAnyField, { message: 'Не передано жодного поля для оновлення' })
  .refine(endsAfterStart, endsAfterStartIssue);

export type ICreateGroupDto = z.infer<typeof createGroupSchema>;
export type IUpdateGroupDto = z.infer<typeof updateGroupSchema>;
