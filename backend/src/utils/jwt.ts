import jwt from 'jsonwebtoken';
import { UserRole } from '@redmonkey/shared';
import { env } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

/**
 * Refresh несе tokenVersion користувача. Розбіжність із версією в БД
 * означає, що сесію відкликано (logout або компрометація).
 */
export interface RefreshTokenPayload extends TokenPayload {
  tokenVersion: number;
}

export const generateAccessToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresInSeconds });

export const generateRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresInSeconds });

export const verifyAccessToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.jwt.accessSecret);
  if (typeof decoded === 'string') {
    throw new jwt.JsonWebTokenError('Неочікуваний формат access-токена');
  }
  return decoded as TokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, env.jwt.refreshSecret);
  if (typeof decoded === 'string') {
    throw new jwt.JsonWebTokenError('Неочікуваний формат refresh-токена');
  }
  return decoded as RefreshTokenPayload;
};
