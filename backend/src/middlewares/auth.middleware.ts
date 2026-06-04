import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../utils/jwt.js';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Користувач не авторизований (відсутній токен)' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || '') as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Недійсний або прострочений токен доступу' });
  }
};

export const authorize = (allowedRoles: ('admin' | 'teacher' | 'student')[]) => {
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