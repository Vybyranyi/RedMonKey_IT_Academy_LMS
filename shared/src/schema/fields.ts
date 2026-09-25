import { z } from 'zod';

/**
 * Будівельні блоки полів, спільні для кількох схем (профіль, адмінське
 * керування користувачами). Файл не реекспортується з index — назовні
 * виходять лише готові схеми, а не ці деталі.
 */

export const PASSWORD_MIN_LENGTH = 6;

// bcrypt мовчки обрізає все після 72 байтів — не даємо завести пароль,
// хвіст якого ні на що не впливає.
export const PASSWORD_MAX_LENGTH = 72;

const PHONE_PATTERN = /^\+?[\d\s()-]{5,20}$/;

/** Порожнє поле форми означає «очистити», а не «залишити як є». */
export const emptyToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

/** «Дані змінюються» — PATCH без жодного поля з білого списку нічого б не зробив. */
export const hasAnyField = (data: object) => Object.keys(data).length > 0;

export const nameField = (label: string) =>
  z
    .string({ error: `${label}: очікується рядок` })
    .trim()
    .min(2, `${label} має містити не менше 2 символів`)
    .max(50, `${label} не може бути довшим за 50 символів`);

export const emailField = z
  .string({ error: 'Потрібно вказати email' })
  .trim()
  .pipe(z.email('Некоректний email').max(254, 'Email задовгий'));

export const passwordField = z
  .string({ error: 'Пароль має бути рядком' })
  .min(PASSWORD_MIN_LENGTH, `Пароль має містити не менше ${PASSWORD_MIN_LENGTH} символів`)
  .max(PASSWORD_MAX_LENGTH, `Пароль не може бути довшим за ${PASSWORD_MAX_LENGTH} символів`);

export const phoneField = z.preprocess(
  emptyToNull,
  z.string().trim().regex(PHONE_PATTERN, 'Некоректний номер телефону').nullable()
);

export const avatarField = z.preprocess(
  emptyToNull,
  z.url('Аватар має бути коректним URL').max(500, 'Задовге посилання на аватар').nullable()
);
