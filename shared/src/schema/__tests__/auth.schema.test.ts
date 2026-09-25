import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MIN_LENGTH,
  changePasswordSchema,
  loginCredentialsSchema,
  updateProfileSchema,
} from '../auth.schema';
import { firstIssue } from './fixtures';

describe('loginCredentialsSchema', () => {
  it('приймає email і пароль', () => {
    expect(
      loginCredentialsSchema.safeParse({ email: 'admin@academy.com', password: 'x' }).success
    ).toBe(true);
  });

  it('відхиляє запит без email', () => {
    const result = loginCredentialsSchema.safeParse({ password: 'secret123' });
    expect(firstIssue(result)).toBe('Потрібно вказати email');
  });

  // Обʼєкт замість рядка інакше дійшов би до Prisma як фільтр { contains: ... }
  it('відхиляє обʼєкт замість email', () => {
    const result = loginCredentialsSchema.safeParse({
      email: { contains: 'admin' },
      password: 'secret123',
    });
    expect(firstIssue(result)).toBe('Потрібно вказати email');
  });

  it('відхиляє порожній пароль', () => {
    const result = loginCredentialsSchema.safeParse({ email: 'admin@academy.com', password: '' });
    expect(firstIssue(result)).toBe('Потрібно вказати пароль');
  });
});

describe('updateProfileSchema', () => {
  it('приймає часткове оновлення', () => {
    expect(updateProfileSchema.safeParse({ firstName: 'Марія' }).success).toBe(true);
  });

  it('відхиляє порожнє тіло', () => {
    const result = updateProfileSchema.safeParse({});
    expect(firstIssue(result)).toBe('Не передано жодного поля для оновлення');
  });

  it('відхиляє закоротке імʼя', () => {
    const result = updateProfileSchema.safeParse({ firstName: 'М' });
    expect(firstIssue(result)).toBe('Імʼя має містити не менше 2 символів');
  });

  // Порожнє поле форми означає «очистити», а не «залишити як є»
  it('перетворює порожній телефон на null', () => {
    expect(updateProfileSchema.parse({ phone: '   ' }).phone).toBeNull();
  });

  it('перетворює порожній аватар на null', () => {
    expect(updateProfileSchema.parse({ avatar: '' }).avatar).toBeNull();
  });

  it('приймає коректний телефон', () => {
    expect(updateProfileSchema.safeParse({ phone: '+380 (67) 123-45-67' }).success).toBe(true);
  });

  it('відхиляє некоректний телефон', () => {
    const result = updateProfileSchema.safeParse({ phone: 'подзвоніть мені' });
    expect(firstIssue(result)).toBe('Некоректний номер телефону');
  });

  it('відхиляє аватар, який не є URL', () => {
    const result = updateProfileSchema.safeParse({ avatar: 'avatar.png' });
    expect(firstIssue(result)).toBe('Аватар має бути коректним URL');
  });
});

describe('changePasswordSchema', () => {
  const valid = { currentPassword: 'oldPass123', newPassword: 'newPass123' };

  it('приймає коректну пару паролів', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('відхиляє закороткий новий пароль', () => {
    const result = changePasswordSchema.safeParse({ ...valid, newPassword: 'a'.repeat(PASSWORD_MIN_LENGTH - 1) });
    expect(firstIssue(result)).toBe(
      `Новий пароль має містити не менше ${PASSWORD_MIN_LENGTH} символів`
    );
  });

  // bcrypt мовчки обрізає все після 72 байтів — хвіст такого пароля ні на що не впливає
  it('відхиляє пароль, довший за 72 символи', () => {
    const result = changePasswordSchema.safeParse({ ...valid, newPassword: 'a'.repeat(73) });
    expect(firstIssue(result)).toBe('Новий пароль не може бути довшим за 72 символів');
  });

  it('відхиляє новий пароль, що збігається з поточним', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'samePass1',
      newPassword: 'samePass1',
    });
    expect(firstIssue(result)).toBe('Новий пароль має відрізнятися від поточного');
  });
});
