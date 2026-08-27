import { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { authService } from '../services/auth.service.js';
import { BadRequestError, UnauthorizedError, handleError } from '../utils/errors.js';

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

    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Користувача не знайдено або він не активний');
    }

    res.status(200).json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      redCoins: user.redCoins,
      phone: user.phone,
    });
  } catch (error) {
    handleError(res, error, 'Помилка сервера');
  }
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError('Не авторизовано');

    const { firstName, lastName, phone, avatar } = req.body;
    const updatedUser = await authService.updateProfile(userId, { firstName, lastName, phone, avatar });

    res.status(200).json(updatedUser);
  } catch (error) {
    handleError(res, error, 'Помилка при оновленні профілю');
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError('Не авторизовано');

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Потрібно вказати поточний та новий пароль');
    }
    if (String(newPassword).length < 6) {
      throw new BadRequestError('Новий пароль має містити не менше 6 символів');
    }

    await authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json({ message: 'Пароль успішно змінено' });
  } catch (error) {
    handleError(res, error, 'Помилка при зміні пароля');
  }
};
