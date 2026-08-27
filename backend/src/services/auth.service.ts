import bcrypt from "bcryptjs";
import { IUpdateProfileDto, UserRole } from '@redmonkey/shared';
import { toPublicUser, userRepository } from '../repositories/user.repository.js';
import { SALT_ROUNDS } from '../config/constants.js';
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";
import {
  RefreshTokenPayload,
  TokenPayload,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Невірний email або пароль");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Невірний email або пароль");
    }

    const payload: TokenPayload = {
      userId: user.id,
      role: user.role as UserRole,
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken({
        ...payload,
        tokenVersion: user.tokenVersion,
      }),
      user: toPublicUser(user),
    };
  },

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedError("Відсутній refresh token");
    }

    let decoded: RefreshTokenPayload;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new ForbiddenError("Невалідний refresh token");
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Користувач не активний або не існує");
    }

    // Сесію відкликано (logout або примусове розлогінення).
    if (decoded.tokenVersion !== user.tokenVersion) {
      throw new ForbiddenError("Сесію завершено. Увійдіть у систему повторно");
    }

    return {
      accessToken: generateAccessToken({
        userId: user.id,
        role: user.role as UserRole,
      }),
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

  async updateProfile(userId: string, data: IUpdateProfileDto) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Користувача не знайдено або він не активний');
    }

    // Свідомо приймаємо лише «безпечні» поля — email/role/groupId сюди не потрапляють.
    return userRepository.update(userId, {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      avatar: data.avatar,
    });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Користувача не знайдено або він не активний');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Поточний пароль вказано невірно');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Як і logout, зміна пароля відкликає всі раніше видані refresh-токени.
    const tokenVersion = await userRepository.updatePassword(userId, passwordHash);

    // ...тому одразу видаємо нову пару під новою версією: решта пристроїв
    // розлогінюється, а поточна сесія працює далі без повторного входу.
    const payload: TokenPayload = { userId: user.id, role: user.role as UserRole };
    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken({ ...payload, tokenVersion }),
    };
  },
};
