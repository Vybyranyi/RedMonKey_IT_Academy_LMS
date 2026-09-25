import { z } from 'zod';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  avatarField,
  hasAnyField,
  nameField,
  phoneField,
} from './fields';

/**
 * Схеми self-service профілю живуть у shared, щоб бекенд і форми на фронті
 * валідували однакові правила й не розходилися після змін.
 */

export { PASSWORD_MIN_LENGTH } from './fields';

/**
 * Тіло POST /auth/login. Лише форма даних, без правил складності пароля —
 * вони діють при створенні/зміні, а не при вході. Без цієї перевірки
 * відсутній email ставав би `where: { email: undefined }` (тобто «перший-ліпший
 * користувач»), а обʼєкт замість рядка — Prisma-фільтром на кшталт { contains }.
 */
export const loginCredentialsSchema = z.object({
  email: z
    .string({ error: 'Потрібно вказати email' })
    .trim()
    .min(1, 'Потрібно вказати email')
    .max(254, 'Email задовгий'),
  password: z.string({ error: 'Потрібно вказати пароль' }).min(1, 'Потрібно вказати пароль'),
});

export const updateProfileSchema = z
  .object({
    firstName: nameField('Імʼя').optional(),
    lastName: nameField('Прізвище').optional(),
    phone: phoneField.optional(),
    avatar: avatarField.optional(),
  })
  .refine(hasAnyField, { message: 'Не передано жодного поля для оновлення' });

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: 'Потрібно вказати поточний пароль' })
      .min(1, 'Потрібно вказати поточний пароль'),
    newPassword: z
      .string({ error: 'Потрібно вказати новий пароль' })
      .min(PASSWORD_MIN_LENGTH, `Новий пароль має містити не менше ${PASSWORD_MIN_LENGTH} символів`)
      .max(
        PASSWORD_MAX_LENGTH,
        `Новий пароль не може бути довшим за ${PASSWORD_MAX_LENGTH} символів`
      ),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Новий пароль має відрізнятися від поточного',
    path: ['newPassword'],
  });

export type ILoginCredentialsDto = z.infer<typeof loginCredentialsSchema>;
export type IUpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type IChangePasswordDto = z.infer<typeof changePasswordSchema>;
