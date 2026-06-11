import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів
    });

    res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error: any) {
    if (error.message === 'Невірний email або пароль') {
      res.status(401).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Помилка сервера при вході', error });
    }
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const result: any = await authService.refresh(refreshToken);
    res.status(200).json({ accessToken: result.accessToken });
  } catch (error: any) {
    if (error.message === 'Відсутній refresh token' || error.message === 'Користувач не активний або не існує') {
      res.status(401).json({ message: error.message });
    } else if (error.message === 'Невалідний refresh token') {
      res.status(403).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Помилка при оновленні токену' });
    }
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Успішний вихід із системи' });
};

import { userRepository } from '../repositories/user.repository.js';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Не авторизовано' });
      return;
    }
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Користувача не знайдено або він не активний' });
      return;
    }
    res.status(200).json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      redCoins: user.redCoins,
    });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};