import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from '../apiError';

const axiosErrorWith = (data: unknown) => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: new AxiosHeaders(),
    config,
  });
};

describe('getApiErrorMessage', () => {
  // Бекенд віддає причину українською в полі message (див. handleError)
  it('віддає повідомлення з відповіді бекенда', () => {
    const error = axiosErrorWith({ message: 'Поточний пароль вказано невірно' });

    expect(getApiErrorMessage(error, 'Не вдалося')).toBe('Поточний пароль вказано невірно');
  });

  it('використовує запасний текст, якщо message порожній', () => {
    expect(getApiErrorMessage(axiosErrorWith({ message: '   ' }), 'Не вдалося')).toBe('Не вдалося');
  });

  it('використовує запасний текст, якщо відповіді немає', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error'), 'Не вдалося')).toBe('Не вдалося');
  });

  it('використовує запасний текст для не-axios помилки', () => {
    expect(getApiErrorMessage(new Error('boom'), 'Не вдалося')).toBe('Не вдалося');
  });

  it('використовує запасний текст, якщо message не рядок', () => {
    expect(getApiErrorMessage(axiosErrorWith({ message: 42 }), 'Не вдалося')).toBe('Не вдалося');
  });
});
