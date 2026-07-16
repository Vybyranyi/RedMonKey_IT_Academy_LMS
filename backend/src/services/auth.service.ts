import bcrypt from 'bcryptjs';
import { UserRole } from '@redmonkey/shared';
import { userRepository } from '../repositories/user.repository.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import {
  RefreshTokenPayload,
  TokenPayload,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Невірний email або пароль');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Невірний email або пароль');
    }

    const payload: TokenPayload = { userId: user.id, role: user.role as UserRole };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken({ ...payload, tokenVersion: user.tokenVersion }),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        redCoins: user.redCoins,
      },
    };
  },

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedError('Відсутній refresh token');
    }

    let decoded: RefreshTokenPayload;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new ForbiddenError('Невалідний refresh token');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Користувач не активний або не існує');
    }

    // Сесію відкликано (logout або примусове розлогінення).
    if (decoded.tokenVersion !== user.tokenVersion) {
      throw new ForbiddenError('Сесію завершено. Увійдіть у систему повторно');
    }

    return {
      accessToken: generateAccessToken({ userId: user.id, role: user.role as UserRole }),
    };
  },

  /**
   * Інкрементує tokenVersion → усі refresh-токени користувача (на всіх пристроях)
   * стають невалідними. Невалідний чи відсутній токен ігноруємо: кука все одно чиститься.
   */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    try {
      const decoded = verifyRefreshToken(refreshToken);
      await userRepository.incrementTokenVersion(decoded.userId);
    } catch {
      return;
    }
  },
};
