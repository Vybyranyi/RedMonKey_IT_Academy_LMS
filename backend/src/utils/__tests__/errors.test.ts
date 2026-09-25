import type { Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  handleError,
} from '../errors.js';

const mockResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & typeof res;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppError та нащадки', () => {
  it.each([
    [new BadRequestError('погано'), 400],
    [new UnauthorizedError('не увійшов'), 401],
    [new ForbiddenError('не можна'), 403],
    [new NotFoundError('нема'), 404],
  ])('%s має статус %i', (error, statusCode) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(statusCode);
  });

  it('зберігає назву класу в name', () => {
    expect(new NotFoundError('нема').name).toBe('NotFoundError');
  });
});

describe('handleError', () => {
  it('віддає очікувану помилку з її статусом і текстом', () => {
    const res = mockResponse();

    handleError(res, new ForbiddenError('У вас немає доступу'), 'Помилка');

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'У вас немає доступу' });
  });

  it('згортає несподівану помилку у 500 із запасним текстом', () => {
    const res = mockResponse();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError(res, new Error('connect ECONNREFUSED'), 'Помилка при отриманні даних');

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Помилка при отриманні даних' });
  });

  // Текст внутрішньої помилки не має витікати клієнту — там бувають дані з БД
  it('не віддає клієнту деталі несподіваної помилки', () => {
    const res = mockResponse();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError(res, new Error('password=secret'), 'Помилка сервера');

    expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret');
  });

  it('логує несподівану помилку', () => {
    const res = mockResponse();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    handleError(res, new Error('boom'), 'Помилка сервера');

    expect(consoleError).toHaveBeenCalled();
  });
});
