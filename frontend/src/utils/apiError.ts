import { isAxiosError, isCancel } from 'axios';
import { toast } from 'sonner';

export const NETWORK_ERROR_MESSAGE = "Немає зв'язку з сервером. Перевірте інтернет і спробуйте ще раз";

/**
 * Refresh-токен теж недійсний: сесію завершено, повторювати запит марно.
 * Interceptor уже розлогінив користувача й показав про це toast — сторінкам
 * нічого додавати не треба.
 */
export class SessionExpiredError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Сесія завершилась', options);
    this.name = 'SessionExpiredError';
  }
}

/**
 * Помилка, про яку користувачу не треба повідомляти: запит скасувала сама
 * сторінка (перемкнули групу, пішли з екрана) або сесія вже завершилась.
 */
export const isSilentError = (error: unknown): boolean =>
  isCancel(error) || error instanceof SessionExpiredError;

/**
 * Бекенд віддає причину помилки українською в полі message (див. handleError).
 * Без цього користувач бачить загальну фразу замість «Поточний пароль вказано
 * невірно» чи «Новий пароль має відрізнятися від поточного».
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error) && !isCancel(error)) {
    // Відповіді немає взагалі: сервер лежить, зник інтернет або запит відрізав CORS
    if (!error.response) return NETWORK_ERROR_MESSAGE;

    const message = error.response.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
};

/**
 * Єдиний спосіб показати помилку запиту. id = текст: коли падає мережа,
 * паралельні запити сторінки дають один toast, а не п'ять однакових.
 */
export const toastApiError = (error: unknown, fallback: string) => {
  if (isSilentError(error)) return;

  const message = getApiErrorMessage(error, fallback);
  toast.error(message, { id: message });
};
