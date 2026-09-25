import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NETWORK_ERROR_MESSAGE,
  SessionExpiredError,
  getApiErrorMessage,
  toastApiError,
} from '../apiError';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

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

  // Сервер лежить або зник інтернет — «Не вдалося завантажити групи» тут нічого не пояснює
  it("повідомляє про відсутність зв'язку, якщо відповіді немає", () => {
    expect(getApiErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'), 'Не вдалося')).toBe(
      NETWORK_ERROR_MESSAGE
    );
  });

  it('використовує запасний текст для не-axios помилки', () => {
    expect(getApiErrorMessage(new Error('boom'), 'Не вдалося')).toBe('Не вдалося');
  });

  it('використовує запасний текст, якщо message не рядок', () => {
    expect(getApiErrorMessage(axiosErrorWith({ message: 42 }), 'Не вдалося')).toBe('Не вдалося');
  });
});

describe('toastApiError', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
  });

  it('показує повідомлення бекенда', () => {
    toastApiError(axiosErrorWith({ message: 'Групу не знайдено' }), 'Не вдалося');

    expect(toast.error).toHaveBeenCalledWith('Групу не знайдено', { id: 'Групу не знайдено' });
  });

  // Сторінка сама скасувала запит (перемкнули групу, пішли з екрана) — це не помилка
  it('мовчить про скасований запит', () => {
    toastApiError(new CanceledError(), 'Не вдалося');

    expect(toast.error).not.toHaveBeenCalled();
  });

  // Про завершену сесію вже повідомив interceptor — другий toast був би дублем
  it('мовчить, якщо сесію завершено', () => {
    toastApiError(new SessionExpiredError(), 'Не вдалося');

    expect(toast.error).not.toHaveBeenCalled();
  });

  // Однаковий id — sonner оновлює той самий toast замість стосу з п'яти однакових
  it('однакові помилки паралельних запитів мають один id', () => {
    toastApiError(new AxiosError('Network Error', 'ERR_NETWORK'), 'Не вдалося завантажити групи');
    toastApiError(new AxiosError('Network Error', 'ERR_NETWORK'), 'Не вдалося завантажити журнал');

    const ids = vi.mocked(toast.error).mock.calls.map(([, options]) => options?.id);
    expect(ids).toEqual([NETWORK_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE]);
  });
});
