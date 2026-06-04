import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../utils/jwt.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Невірний email або пароль' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Невірний email або пароль' });
      return;
    }

    const payload: TokenPayload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів
    });

    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        redCoins: user.redCoins,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера при вході', error });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ message: 'Відсутній refresh token' });
      return;
    }

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || '',
      async (err: any, decoded: any) => {
        if (err) {
          res.status(403).json({ message: 'Невалідний refresh token' });
          return;
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
          res.status(401).json({ message: 'Користувач не активний або не існує' });
          return;
        }

        const payload: TokenPayload = { userId: user._id.toString(), role: user.role };
        const accessToken = generateAccessToken(payload);

        res.status(200).json({ accessToken });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Помилка при оновленні токену' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Успішний вихід із системи' });
};