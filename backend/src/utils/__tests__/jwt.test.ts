import jwt from 'jsonwebtoken';
import { UserRole } from '@redmonkey/shared';
import { describe, expect, it } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../jwt.js';

const payload = { userId: 'user-1', role: UserRole.TEACHER };

describe('access-токен', () => {
  it('переживає повний цикл підпис → перевірка', () => {
    const decoded = verifyAccessToken(generateAccessToken(payload));

    expect(decoded.userId).toBe('user-1');
    expect(decoded.role).toBe(UserRole.TEACHER);
  });

  it('відхиляє підроблений токен', () => {
    expect(() => verifyAccessToken('not.a.token')).toThrow();
  });

  it('відхиляє прострочений токен', () => {
    const expired = jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, { expiresIn: -10 });
    expect(() => verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
  });
});

describe('refresh-токен', () => {
  it('несе tokenVersion користувача', () => {
    const decoded = verifyRefreshToken(generateRefreshToken({ ...payload, tokenVersion: 3 }));

    expect(decoded.tokenVersion).toBe(3);
    expect(decoded.userId).toBe('user-1');
  });

  // Різні секрети — щоб access-токен не можна було пред'явити замість refresh
  it('не приймає access-токен замість refresh', () => {
    expect(() => verifyRefreshToken(generateAccessToken(payload))).toThrow(jwt.JsonWebTokenError);
  });

  it('не приймає refresh-токен замість access', () => {
    const refresh = generateRefreshToken({ ...payload, tokenVersion: 1 });
    expect(() => verifyAccessToken(refresh)).toThrow(jwt.JsonWebTokenError);
  });
});
