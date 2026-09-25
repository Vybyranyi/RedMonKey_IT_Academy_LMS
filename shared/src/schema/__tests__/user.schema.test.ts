import { describe, expect, it } from 'vitest';
import { UserRole } from '../../enums';
import { createUserSchema, updateUserSchema, userFiltersSchema } from '../user.schema';
import { UUID, firstIssue } from './fixtures';

const validUser = {
  firstName: 'Іван',
  lastName: 'Петренко',
  email: 'ivan@academy.com',
  role: UserRole.STUDENT,
  password: 'secret123',
};

describe('createUserSchema', () => {
  it('приймає тіло, яке шле форма створення студента', () => {
    const result = createUserSchema.safeParse({
      ...validUser,
      phone: '',
      group: UUID.group,
    });

    expect(result.success).toBe(true);
    // Порожній телефон з форми — «без телефону», а не рядок ''
    expect(result.data?.phone).toBeNull();
  });

  // Білий список: усе, що не описано в схемі, до Prisma не доходить
  it('відкидає службові поля й баланс', () => {
    const data = createUserSchema.parse({
      ...validUser,
      redCoins: 1000,
      tokenVersion: 5,
      passwordHash: '$2a$10$fake',
      academyId: UUID.group,
      isActive: false,
    });

    expect(Object.keys(data).sort()).toEqual([
      'email',
      'firstName',
      'lastName',
      'password',
      'role',
    ]);
  });

  it('обрізає пробіли навколо email', () => {
    expect(createUserSchema.parse({ ...validUser, email: '  ivan@academy.com ' }).email).toBe(
      'ivan@academy.com'
    );
  });

  it.each([
    [{ email: undefined }, 'Потрібно вказати email'],
    [{ email: 'not-an-email' }, 'Некоректний email'],
    [{ firstName: 'І' }, 'Імʼя має містити не менше 2 символів'],
    [{ lastName: 42 }, 'Прізвище: очікується рядок'],
    [{ role: 'root' }, 'Некоректна роль'],
    // Без пароля акаунт раніше отримував спільний пароль із коду
    [{ password: undefined }, 'Потрібно вказати пароль'],
    [{ password: '12345' }, 'Пароль має містити не менше 6 символів'],
    [{ password: 'x'.repeat(73) }, 'Пароль не може бути довшим за 72 символів'],
    [{ phone: 'abc' }, 'Некоректний номер телефону'],
    [{ group: 'group-1' }, 'group має бути UUID групи'],
  ])('відхиляє %o', (patch, message) => {
    expect(firstIssue(createUserSchema.safeParse({ ...validUser, ...patch }))).toBe(message);
  });
});

describe('updateUserSchema', () => {
  it('приймає часткове оновлення', () => {
    expect(updateUserSchema.safeParse({ firstName: 'Анна' }).success).toBe(true);
  });

  it('відкидає redCoins, tokenVersion і passwordHash, лишаючи дозволені поля', () => {
    const data = updateUserSchema.parse({
      firstName: 'Анна',
      redCoins: 999_999,
      tokenVersion: 0,
      passwordHash: '$2a$10$fake',
      createdAt: '2020-01-01',
    });

    expect(data).toEqual({ firstName: 'Анна' });
  });

  // Інакше PATCH лише з забороненими полями тихо віддавав би 200, нічого не змінивши
  it('відхиляє тіло, у якому немає жодного дозволеного поля', () => {
    const result = updateUserSchema.safeParse({ redCoins: 999_999, tokenVersion: 0 });

    expect(firstIssue(result)).toBe('Не передано жодного поля для оновлення');
  });

  it('дозволяє прибрати студента з групи через null', () => {
    expect(updateUserSchema.parse({ group: null })).toEqual({ group: null });
  });

  it('дозволяє повернути деактивованого користувача', () => {
    expect(updateUserSchema.parse({ isActive: true })).toEqual({ isActive: true });
  });

  it.each([
    [{ isActive: 'yes' }, 'isActive має бути true або false'],
    [{ avatar: 'not-a-url' }, 'Аватар має бути коректним URL'],
    [{ email: 'nope' }, 'Некоректний email'],
  ])('відхиляє %o', (body, message) => {
    expect(firstIssue(updateUserSchema.safeParse(body))).toBe(message);
  });
});

describe('userFiltersSchema', () => {
  it('приймає фільтри сторінки студентів', () => {
    expect(
      userFiltersSchema.parse({ role: UserRole.STUDENT, groupId: UUID.group, q: '  Коваль ' })
    ).toEqual({ role: UserRole.STUDENT, groupId: UUID.group, q: 'Коваль' });
  });

  it('порожній groupId означає «усі групи»', () => {
    expect(userFiltersSchema.parse({ groupId: '', q: '' })).toEqual({ groupId: undefined, q: '' });
  });

  it('відхиляє невідому роль', () => {
    expect(firstIssue(userFiltersSchema.safeParse({ role: 'superadmin' }))).toBe('Некоректна роль');
  });

  it('відхиляє groupId, що не є UUID', () => {
    expect(firstIssue(userFiltersSchema.safeParse({ groupId: 'js-1' }))).toBe(
      'groupId має бути UUID'
    );
  });
});
