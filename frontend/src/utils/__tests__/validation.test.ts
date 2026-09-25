import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loginSchema, validateWithZod } from '../validation';

describe('loginSchema', () => {
  it('приймає коректні дані', () => {
    expect(
      loginSchema.safeParse({ email: 'admin@academy.com', password: 'secret123' }).success
    ).toBe(true);
  });

  it.each([
    ['', 'Email обовʼязковий'],
    ['not-an-email', 'Некоректний формат email'],
  ])('відхиляє email "%s"', (email, message) => {
    const errors = validateWithZod(loginSchema)({ email, password: 'secret123' });
    expect(errors.email).toBe(message);
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

  // Поле може порушити кілька правил одразу — показуємо перше, як і parseBody на бекенді
  it('лишає перше порушення поля, а не останнє', () => {
    const schema = z.object({
      code: z.string().min(3, 'Закоротко').regex(/^\d+$/, 'Лише цифри'),
    });

    expect(validateWithZod(schema)({ code: 'ab' }).code).toBe('Закоротко');
  });
});
