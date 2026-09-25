import type { NextFunction, Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { errorHandler, notFoundHandler } from '../error.middleware.js';

const mockResponse = (headersSent = false) => {
  const res = { headersSent, status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & typeof res;
};

const req = { method: 'GET', path: '/api/v1/nope' } as Request;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('notFoundHandler', () => {
  it('передає далі NotFoundError з методом і шляхом', () => {
    const next = vi.fn();

    notFoundHandler(req, mockResponse(), next);

    const [error] = next.mock.calls[0] as [NotFoundError];
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('Маршрут GET /api/v1/nope не знайдено');
  });
});

describe('errorHandler', () => {
  it('віддає AppError з його статусом і текстом', () => {
    const res = mockResponse();

    errorHandler(new ForbiddenError('Не можна'), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Не можна' });
  });

  it('невідому 4xx-помилку Express віддає з її статусом і загальним текстом', () => {
    const res = mockResponse();

    errorHandler(Object.assign(new Error('aborted'), { status: 400, type: 'request.aborted' }), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Некоректний запит' });
  });

  // Текст і стек несподіваної помилки лишаються в логах сервера
  it('несподівану помилку згортає у 500 без деталей', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockResponse();

    errorHandler(new Error('relation "users" does not exist'), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Внутрішня помилка сервера' });
  });

  it('якщо відповідь уже почала відправлятися, віддає помилку Express', () => {
    const res = mockResponse(true);
    const next = vi.fn() as NextFunction;
    const error = new Error('stream broke');

    errorHandler(error, req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
