import { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { authService } from '../services/auth.service.js';
import { UnauthorizedError, handleError } from '../utils/errors.js';
import { parseBody } from '../utils/validation.js';
import { changePasswordSchema, updateProfileSchema } from '@redmonkey/shared';

const REFRESH_COOKIE = 'refreshToken';

/** clearCookie спрацює лише якщо опції збігаються з тими, з якими куку виставили. */
const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict',
  path: '/',
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...refreshCookieOptions,
      maxAge: env.jwt.refreshExpiresInSeconds * 1000,
    });

    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    handleError(res, error, 'Помилка сервера при вході');
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
    res.status(200).json({ accessToken: result.accessToken });
  } catch (error) {
    handleError(res, error, 'Помилка при оновленні токену');
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    res.status(200).json({ message: 'Успішний вихід із системи' });
  } catch (error) {
    handleError(res, error, 'Помилка при виході із системи');
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Не авторизовано');
    }

    // findByIdActive повертає ту саму публічну проєкцію, що й PATCH /auth/me,
    // тож клієнт отримує однакову форму користувача з обох ендпоінтів.
    const user = await userRepository.findByIdActive(userId);
    if (!user) {
      throw new UnauthorizedError('Користувача не знайдено або він не активний');
    }

    res.status(200).json(user);
  } catch (error) {
    handleError(res, error, 'Помилка сервера');
  }
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Не авторизовано');
    }

    const data = parseBody(updateProfileSchema, req.body);
    const updatedUser = await authService.updateProfile(userId, data);

    res.status(200).json(updatedUser);
  } catch (error) {
    handleError(res, error, 'Помилка при оновленні профілю');
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Не авторизовано');
    }

    const { currentPassword, newPassword } = parseBody(changePasswordSchema, req.body);
    const tokens = await authService.changePassword(userId, currentPassword, newPassword);

    // Стара refresh-кука вже недійсна — перевиставляємо її новою парою,
    // інакше клієнт отримає 403 на найближчому /auth/refresh.
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...refreshCookieOptions,
      maxAge: env.jwt.refreshExpiresInSeconds * 1000,
    });

    res.status(200).json({
      message: 'Пароль успішно змінено',
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    handleError(res, error, 'Помилка при зміні пароля');
  }
};
