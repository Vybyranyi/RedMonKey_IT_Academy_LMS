import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository.js';
import { generateAccessToken, generateRefreshToken, TokenPayload } from '../utils/jwt.js';

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new Error('Невірний email або пароль');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Невірний email або пароль');
    }

    const payload: TokenPayload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        redCoins: user.redCoins,
      },
    };
  },

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new Error('Відсутній refresh token');
    }

    return new Promise((resolve, reject) => {
      jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || '',
        async (err: any, decoded: any) => {
          if (err) {
            return reject(new Error('Невалідний refresh token'));
          }

          const user = await userRepository.findById(decoded.userId);
          if (!user || !user.isActive) {
            return reject(new Error('Користувач не активний або не існує'));
          }

          const payload: TokenPayload = { userId: user._id.toString(), role: user.role };
          const accessToken = generateAccessToken(payload);

          resolve({ accessToken });
        }
      );
    });
  }
};
