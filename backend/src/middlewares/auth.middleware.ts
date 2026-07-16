import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@redmonkey/shared';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Користувач не авторизований (відсутній токен)' });
    return;
  }

  const token = authHeader.split(' ')[1] as string;

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Недійсний або прострочений токен доступу' });
  }
};

export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Авторизація обовʼязкова' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'У вас немає доступу до цієї операції' });
      return;
    }

    next();
  };
};
