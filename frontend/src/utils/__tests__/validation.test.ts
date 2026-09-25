import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loginSchema, validateWithZod } from '../validation';

describe('loginSchema', () => {
  it('приймає коректні дані', () => {
    expect(loginSchema.safeParse({ email: 'admin@academy.com', password: 'secret123' }).success).toBe(
      true
    );
  });

  it('відхиляє некоректний email', () => {
    const errors = validateWithZod(loginSchema)({ email: 'not-an-email', password: 'secret123' });
    expect(errors.email).toBe('Некоректний формат email');
  });

  // Порожній email порушує одразу два правила (min(1) і email()), тож текст
  // залежить від порядку issues — фіксуємо лише сам факт помилки
  it('відхиляє порожній email', () => {
    const errors = validateWithZod(loginSchema)({ email: '', password: 'secret123' });
    expect(errors.email).toBeTruthy();
  });

  it('відхиляє закороткий пароль', () => {
    const errors = validateWithZod(loginSchema)({ email: 'admin@academy.com', password: '123' });
    expect(errors.password).toBe('Пароль має містити не менше 6 символів');
  });
});

describe('validateWithZod', () => {
  // Formik очікує порожній обʼєкт як «помилок немає»
  it('повертає порожній обʼєкт, коли дані валідні', () => {
    const validate = validateWithZod(z.object({ name: z.string() }));
    expect(validate({ name: 'Анна' })).toEqual({});
  });

  it('розкладає помилки по іменах полів', () => {
    const errors = validateWithZod(loginSchema)({ email: '', password: '' });

    expect(Object.keys(errors).sort()).toEqual(['email', 'password']);
  });
});
