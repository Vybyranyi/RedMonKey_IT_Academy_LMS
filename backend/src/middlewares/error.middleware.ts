import { ErrorRequestHandler, RequestHandler } from 'express';
import { JSON_BODY_LIMIT } from '../config/constants.js';
import { NotFoundError, handleError } from '../utils/errors.js';

/**
 * Помилки, які кидає сам Express/body-parser ще до контролера (http-errors):
 * у них є status 4xx і type. Без окремої обробки битий JSON чи завелике тіло
 * перетворилися б на 500 або HTML-сторінку зі стеком.
 */
interface HttpError {
  status?: number;
  type?: string;
}

const CLIENT_ERROR_MESSAGES: Record<string, string> = {
  'entity.parse.failed': 'Тіло запиту містить некоректний JSON',
  'entity.too.large': `Тіло запиту завелике (максимум ${JSON_BODY_LIMIT})`,
  'charset.unsupported': 'Непідтримуване кодування тіла запиту',
  'encoding.unsupported': 'Непідтримуване кодування тіла запиту',
};

const isClientHttpError = (error: unknown): error is HttpError & { status: number } => {
  const status = (error as HttpError | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
};

/** Реєструється після всіх маршрутів: сюди доходять лише запити, які ніхто не обробив. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Маршрут ${req.method} ${req.path} не знайдено`));
};

/**
 * Останній рубіж: ловить усе, що не обробив контролер (помилки парсингу тіла,
 * 404 вище, винятки з middleware). Контролери й далі самі викликають handleError
 * з контекстним текстом — сюди потрапляє лише те, що проскочило повз них.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  // Відповідь уже почала відправлятися — дописати JSON неможливо,
  // тож за документацією Express віддаємо помилку вбудованому обробнику
  if (res.headersSent) {
    next(error);
    return;
  }

  if (isClientHttpError(error)) {
    const message = CLIENT_ERROR_MESSAGES[error.type ?? ''] ?? 'Некоректний запит';
    res.status(error.status).json({ message });
    return;
  }

  handleError(res, error, 'Внутрішня помилка сервера');
};
