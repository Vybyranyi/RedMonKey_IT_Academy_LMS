import { z } from 'zod';
import { UserRole } from '../enums';
import {
  avatarField,
  emailField,
  hasAnyField,
  nameField,
  passwordField,
  phoneField,
} from './fields';

/**
 * Адмінське керування користувачами: POST /users і PATCH /users/:id.
 *
 * z.object відкидає всі ключі поза цим переліком, тому redCoins, tokenVersion,
 * passwordHash, academyId чи createdAt з тіла запиту до Prisma не доходять.
 * Баланс змінюють лише транзакції RedCoins (інакше він розійдеться з ledger),
 * tokenVersion і хеш пароля — лише auth.service та bcrypt.
 */

const role = z.enum(UserRole, { error: 'Некоректна роль' });

/** null — прибрати студента з групи. */
const group = z.uuid('group має бути UUID групи').nullable();

export const createUserSchema = z.object({
  firstName: nameField('Імʼя'),
  lastName: nameField('Прізвище'),
  email: emailField,
  role,
  password: passwordField.optional(),
  phone: phoneField.optional(),
  group: group.optional(),
});

export const updateUserSchema = z
  .object({
    firstName: nameField('Імʼя').optional(),
    lastName: nameField('Прізвище').optional(),
    email: emailField.optional(),
    role: role.optional(),
    password: passwordField.optional(),
    phone: phoneField.optional(),
    avatar: avatarField.optional(),
    group: group.optional(),
    // Єдиний спосіб повернути деактивованого користувача — DELETE лише деактивує
    isActive: z.boolean({ error: 'isActive має бути true або false' }).optional(),
  })
  .refine(hasAnyField, { message: 'Не передано жодного поля для оновлення' });

/** GET /users. q шукає за імʼям, прізвищем або email. */
export const userFiltersSchema = z.object({
  role: role.optional(),
  // «Усі групи» у фільтрі StudentsPage приходить як groupId= — це «без фільтра», а не помилка
  groupId: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.uuid('groupId має бути UUID').optional()
  ),
  q: z
    .string({ error: 'q має бути рядком' })
    .trim()
    .max(100, 'Задовгий пошуковий запит')
    .optional(),
});

export type ICreateUserDto = z.infer<typeof createUserSchema>;
export type IUpdateUserDto = z.infer<typeof updateUserSchema>;
export type IUserFilters = z.infer<typeof userFiltersSchema>;
