import bcrypt from 'bcryptjs';
import { UserRole } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userRepository } from '../../repositories/user.repository.js';
import { ForbiddenError, UnauthorizedError } from '../../utils/errors.js';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '../../utils/jwt.js';
import { authService } from '../auth.service.js';

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));

vi.mock('../../repositories/user.repository.js', () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    updatePassword: vi.fn(),
    incrementTokenVersion: vi.fn(),
  },
  // Дзеркалить справжню проєкцію: passwordHash і tokenVersion назовні не йдуть
  toPublicUser: (user: Record<string, unknown>) => {
    const { passwordHash, tokenVersion, ...publicUser } = user;
    return publicUser;
  },
}));

const compare = vi.mocked(bcrypt.compare);
const hash = vi.mocked(bcrypt.hash);
const findByEmail = vi.mocked(userRepository.findByEmail);
const findById = vi.mocked(userRepository.findById);
const update = vi.mocked(userRepository.update);
const updatePassword = vi.mocked(userRepository.updatePassword);
const incrementTokenVersion = vi.mocked(userRepository.incrementTokenVersion);

const dbUser = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'user-1',
    email: 'teacher@academy.com',
    role: UserRole.TEACHER,
    isActive: true,
    passwordHash: 'hashed',
    tokenVersion: 1,
    ...overrides,
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  compare.mockResolvedValue(true as never);
  hash.mockResolvedValue('new-hash' as never);
});

describe('login', () => {
  it('не пускає неіснуючого користувача', async () => {
    findByEmail.mockResolvedValue(null as never);

    await expect(authService.login('nobody@academy.com', 'pass')).rejects.toThrow(UnauthorizedError);
  });

  it('не пускає деактивованого користувача', async () => {
    findByEmail.mockResolvedValue(dbUser({ isActive: false }));

    await expect(authService.login('teacher@academy.com', 'pass')).rejects.toThrow(UnauthorizedError);
  });

  it('не пускає з невірним паролем', async () => {
    findByEmail.mockResolvedValue(dbUser());
    compare.mockResolvedValue(false as never);

    await expect(authService.login('teacher@academy.com', 'wrong')).rejects.toThrow(
      UnauthorizedError
    );
  });

  // Однаковий текст для «нема такого email» і «невірний пароль» — щоб не можна
  // було перебором дізнатися, які email зареєстровані
  it('не розрізняє в тексті невідомий email і невірний пароль', async () => {
    findByEmail.mockResolvedValue(null as never);
    const unknownEmail = await authService.login('nobody@academy.com', 'pass').catch((e) => e.message);

    findByEmail.mockResolvedValue(dbUser());
    compare.mockResolvedValue(false as never);
    const wrongPassword = await authService.login('teacher@academy.com', 'x').catch((e) => e.message);

    expect(unknownEmail).toBe(wrongPassword);
  });

  it('видає пару токенів із правильним payload', async () => {
    findByEmail.mockResolvedValue(dbUser());

    const result = await authService.login('teacher@academy.com', 'pass');

    expect(verifyAccessToken(result.accessToken)).toMatchObject({
      userId: 'user-1',
      role: UserRole.TEACHER,
    });
    expect(result.refreshToken).toBeTypeOf('string');
  });

  it('не віддає клієнту хеш пароля і tokenVersion', async () => {
    findByEmail.mockResolvedValue(dbUser());

    const result = await authService.login('teacher@academy.com', 'pass');

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('tokenVersion');
  });
});

describe('refresh', () => {
  it('вимагає токен', async () => {
    await expect(authService.refresh(undefined)).rejects.toThrow(UnauthorizedError);
  });

  it('відхиляє невалідний токен', async () => {
    await expect(authService.refresh('not.a.token')).rejects.toThrow(ForbiddenError);
  });

  it('відхиляє access-токен, пред’явлений замість refresh', async () => {
    const access = generateAccessToken({ userId: 'user-1', role: UserRole.TEACHER });

    await expect(authService.refresh(access)).rejects.toThrow(ForbiddenError);
  });

  // Розбіжність версій означає, що сесію відкликано (logout або зміна пароля)
  it('відхиляє токен зі старою tokenVersion', async () => {
    findById.mockResolvedValue(dbUser({ tokenVersion: 2 }));
    const stale = generateRefreshToken({ userId: 'user-1', role: UserRole.TEACHER, tokenVersion: 1 });

    await expect(authService.refresh(stale)).rejects.toThrow('Сесію завершено. Увійдіть у систему повторно');
  });

  it('відхиляє токен деактивованого користувача', async () => {
    findById.mockResolvedValue(dbUser({ isActive: false }));
    const token = generateRefreshToken({ userId: 'user-1', role: UserRole.TEACHER, tokenVersion: 1 });

    await expect(authService.refresh(token)).rejects.toThrow(UnauthorizedError);
  });

  it('видає новий access-токен за актуальним refresh', async () => {
    findById.mockResolvedValue(dbUser({ tokenVersion: 1 }));
    const token = generateRefreshToken({ userId: 'user-1', role: UserRole.TEACHER, tokenVersion: 1 });

    const { accessToken } = await authService.refresh(token);

    expect(verifyAccessToken(accessToken).userId).toBe('user-1');
  });
});

describe('logout', () => {
  it('нічого не робить без токена', async () => {
    await authService.logout(undefined);

    expect(incrementTokenVersion).not.toHaveBeenCalled();
  });

  it('не падає на невалідному токені — куку все одно буде почищено', async () => {
    await expect(authService.logout('garbage')).resolves.toBeUndefined();
    expect(incrementTokenVersion).not.toHaveBeenCalled();
  });

  // Інкремент версії миттєво вбиває refresh-токени на всіх пристроях
  it('інкрементує tokenVersion за валідним токеном', async () => {
    const token = generateRefreshToken({ userId: 'user-1', role: UserRole.TEACHER, tokenVersion: 1 });

    await authService.logout(token);

    expect(incrementTokenVersion).toHaveBeenCalledWith('user-1');
  });
});

describe('updateProfile', () => {
  it('відхиляє оновлення для деактивованого користувача', async () => {
    findById.mockResolvedValue(dbUser({ isActive: false }));

    await expect(authService.updateProfile('user-1', { firstName: 'Анна' })).rejects.toThrow(
      UnauthorizedError
    );
  });

  // Через self-service профіль не можна змінити роль, email чи групу
  it('пропускає лише безпечні поля', async () => {
    findById.mockResolvedValue(dbUser());

    await authService.updateProfile('user-1', {
      firstName: 'Анна',
      ...({ role: UserRole.ADMIN, email: 'hack@academy.com' } as object),
    });

    expect(update).toHaveBeenCalledWith('user-1', {
      firstName: 'Анна',
      lastName: undefined,
      phone: undefined,
      avatar: undefined,
    });
  });
});

describe('changePassword', () => {
  it('відхиляє невірний поточний пароль', async () => {
    findById.mockResolvedValue(dbUser());
    compare.mockResolvedValue(false as never);

    await expect(authService.changePassword('user-1', 'wrong', 'newPass123')).rejects.toThrow(
      'Поточний пароль вказано невірно'
    );
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('зберігає хеш нового пароля', async () => {
    findById.mockResolvedValue(dbUser());
    updatePassword.mockResolvedValue(2 as never);

    await authService.changePassword('user-1', 'oldPass1', 'newPass123');

    expect(hash).toHaveBeenCalledWith('newPass123', expect.any(Number));
    expect(updatePassword).toHaveBeenCalledWith('user-1', 'new-hash');
  });

  // Зміна пароля розлогінює решту пристроїв, але поточну сесію лишає живою
  it('видає нову пару токенів під новою версією', async () => {
    findById.mockResolvedValue(dbUser());
    updatePassword.mockResolvedValue(2 as never);

    const result = await authService.changePassword('user-1', 'oldPass1', 'newPass123');

    expect(verifyAccessToken(result.accessToken).userId).toBe('user-1');
    expect(result.refreshToken).toBeTypeOf('string');
  });
});
