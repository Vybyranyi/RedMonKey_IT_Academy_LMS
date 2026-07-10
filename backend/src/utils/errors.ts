import { Response } from 'express';

export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

/**
 * Очікувані помилки віддаються клієнту, несподівані — логуються і згортаються у 500.
 * Внутрішній обʼєкт помилки ніколи не потрапляє у відповідь.
 */
export const handleError = (res: Response, error: unknown, fallbackMessage: string): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(`[error]: ${fallbackMessage}`, error);
  res.status(500).json({ message: fallbackMessage });
};
