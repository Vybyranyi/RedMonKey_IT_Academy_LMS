import { z } from 'zod';

/**
 * Схеми self-service профілю живуть у shared, щоб бекенд і форми на фронті
 * валідували однакові правила й не розходилися після змін.
 */

export const PASSWORD_MIN_LENGTH = 6;

// bcrypt мовчки обрізає все після 72 байтів — не даємо завести пароль,
// хвіст якого ні на що не впливає.
const PASSWORD_MAX_LENGTH = 72;

const PHONE_PATTERN = /^\+?[\d\s()-]{5,20}$/;

/** Порожнє поле форми означає «очистити», а не «залишити як є». */
const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const nameField = (label: string) =>
  z
    .string({ error: `${label}: очікується рядок` })
    .trim()
    .min(2, `${label} має містити не менше 2 символів`)
    .max(50, `${label} не може бути довшим за 50 символів`);

export const updateProfileSchema = z
  .object({
    firstName: nameField('Імʼя').optional(),
    lastName: nameField('Прізвище').optional(),
    phone: z
      .preprocess(
        emptyToNull,
        z.string().trim().regex(PHONE_PATTERN, 'Некоректний номер телефону').nullable()
      )
      .optional(),
    avatar: z
      .preprocess(
        emptyToNull,
        z.url('Аватар має бути коректним URL').max(500, 'Задовге посилання на аватар').nullable()
      )
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Не передано жодного поля для оновлення',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: 'Потрібно вказати поточний пароль' })
      .min(1, 'Потрібно вказати поточний пароль'),
    newPassword: z
      .string({ error: 'Потрібно вказати новий пароль' })
      .min(PASSWORD_MIN_LENGTH, `Новий пароль має містити не менше ${PASSWORD_MIN_LENGTH} символів`)
      .max(PASSWORD_MAX_LENGTH, `Новий пароль не може бути довшим за ${PASSWORD_MAX_LENGTH} символів`),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Новий пароль має відрізнятися від поточного',
    path: ['newPassword'],
  });

export type IUpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type IChangePasswordDto = z.infer<typeof changePasswordSchema>;
