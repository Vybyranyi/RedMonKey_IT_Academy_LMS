import { z } from 'zod';
import { CoinCategory } from '../enums';

export const COIN_AMOUNT_MIN = -1000;
export const COIN_AMOUNT_MAX = 1000;
export const LEADERBOARD_DEFAULT_LIMIT = 10;
export const COIN_HISTORY_DEFAULT_LIMIT = 20;
export const COIN_HISTORY_MAX_LIMIT = 100;

// amount ≠ 0 не описати CHECK-обмеженням у Prisma, тож ця схема — єдине місце,
// де правило реально перевіряється. Мінус — списання (penalty), плюс — нарахування.
const amount = z
  .number({ error: 'Кількість монет має бути числом' })
  .int('Кількість монет має бути цілим числом')
  .min(COIN_AMOUNT_MIN, `Не менше ${COIN_AMOUNT_MIN}`)
  .max(COIN_AMOUNT_MAX, `Не більше ${COIN_AMOUNT_MAX}`)
  .refine((value) => value !== 0, 'Кількість монет не може дорівнювати нулю');

const reason = z
  .string({ error: 'Причина має бути рядком' })
  .trim()
  .min(3, 'Причина: не менше 3 символів')
  .max(200, 'Причина: не більше 200 символів');

const category = z.enum(CoinCategory, { error: 'Некоректна категорія' });

const studentId = z.uuid('studentId має бути UUID');
const groupId = z.uuid('groupId має бути UUID');
const relatedLessonId = z.uuid('relatedLessonId має бути UUID');

export const createCoinTransactionSchema = z.object({
  studentId,
  amount,
  reason,
  category,
  relatedLessonId: relatedLessonId.optional(),
});

/**
 * GET /coins/transactions — історія сторінками (keyset): без limit адмін
 * отримував би весь ledger академії одним запитом.
 * cursor — id останньої транзакції попередньої сторінки (nextCursor з відповіді).
 */
export const coinFiltersSchema = z.object({
  studentId: studentId.optional(),
  groupId: groupId.optional(),
  category: category.optional(),
  limit: z.coerce
    .number({ error: 'limit має бути числом' })
    .int('limit має бути цілим числом')
    .min(1, 'limit не може бути меншим за 1')
    .max(COIN_HISTORY_MAX_LIMIT, `limit не може бути більшим за ${COIN_HISTORY_MAX_LIMIT}`)
    .default(COIN_HISTORY_DEFAULT_LIMIT),
  cursor: z.uuid('cursor має бути UUID транзакції').optional(),
});

export const leaderboardFiltersSchema = z.object({
  groupId: groupId.optional(),
  limit: z.coerce
    .number({ error: 'limit має бути числом' })
    .int('limit має бути цілим числом')
    .min(1, 'limit не може бути меншим за 1')
    .max(100, 'limit не може бути більшим за 100')
    .default(LEADERBOARD_DEFAULT_LIMIT),
});

export type ICoinTransactionDto = z.infer<typeof createCoinTransactionSchema>;
export type ICoinFilters = z.infer<typeof coinFiltersSchema>;
export type ILeaderboardFilters = z.infer<typeof leaderboardFiltersSchema>;
