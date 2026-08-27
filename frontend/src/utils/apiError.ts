import { isAxiosError } from 'axios';

/**
 * Бекенд віддає причину помилки українською в полі message (див. handleError).
 * Без цього користувач бачить загальну фразу замість «Поточний пароль вказано
 * невірно» чи «Новий пароль має відрізнятися від поточного».
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
};
