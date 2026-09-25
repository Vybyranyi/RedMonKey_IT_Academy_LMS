import { rateLimit } from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Лічильники живуть у пам'яті процесу (MemoryStore): на один інстанс цього
 * достатньо. Якщо backend колись масштабуватиметься на кілька інстансів —
 * потрібен спільний store (Redis), інакше кожен рахуватиме своє.
 */
const baseOptions = {
  windowMs: FIFTEEN_MINUTES,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
} as const;

/**
 * Загальний захист від флуду й скрейпінгу, а не від звичайної роботи.
 * Ліміт щедрий, бо рахується за IP: студенти в одній аудиторії виходять
 * в інтернет через спільний NAT і для сервера виглядають одним клієнтом.
 */
export const apiLimiter = rateLimit({
  ...baseOptions,
  limit: 1000,
  // Health-check платформи хостингу не має впиратися в ліміт і «вбивати» сервіс
  skip: (req) => req.path === '/health',
  message: { message: 'Забагато запитів. Спробуйте за кілька хвилин' },
});

/**
 * Захист від перебору паролів. Рахуються лише невдалі спроби (статус ≥ 400),
 * тож успішні входи цілої групи з однієї IP ліміт не з'їдають.
 */
export const loginLimiter = rateLimit({
  ...baseOptions,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { message: 'Забагато невдалих спроб входу. Спробуйте через 15 хвилин' },
});

/**
 * Легітимний клієнт звертається сюди раз на життя access-токена (15 хв) —
 * частіше буває лише при зациклених запитах або підборі токенів.
 */
export const refreshLimiter = rateLimit({
  ...baseOptions,
  limit: 60,
  message: { message: 'Забагато спроб оновити сесію. Увійдіть у систему повторно' },
});
