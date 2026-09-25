import { describe, expect, it } from 'vitest';
import { CoinCategory } from '../../enums';
import {
  COIN_AMOUNT_MAX,
  COIN_AMOUNT_MIN,
  LEADERBOARD_DEFAULT_LIMIT,
  COIN_HISTORY_DEFAULT_LIMIT,
  COIN_HISTORY_MAX_LIMIT,
  coinFiltersSchema,
  createCoinTransactionSchema,
  leaderboardFiltersSchema,
} from '../coin.schema';
import { UUID, firstIssue } from './fixtures';

const validTransaction = {
  studentId: UUID.student,
  amount: 50,
  reason: 'Активність на занятті',
  category: CoinCategory.ACTIVITY,
};

describe('createCoinTransactionSchema', () => {
  it('приймає нарахування', () => {
    expect(createCoinTransactionSchema.safeParse(validTransaction).success).toBe(true);
  });

  it('приймає списання (відʼємна сума)', () => {
    const result = createCoinTransactionSchema.safeParse({
      ...validTransaction,
      amount: -30,
      category: CoinCategory.PENALTY,
    });
    expect(result.success).toBe(true);
  });

  // amount ≠ 0 не описати CHECK-обмеженням у Prisma — ця схема єдина, де правило живе
  it('відхиляє нульову суму', () => {
    const result = createCoinTransactionSchema.safeParse({ ...validTransaction, amount: 0 });
    expect(firstIssue(result)).toBe('Кількість монет не може дорівнювати нулю');
  });

  it.each([COIN_AMOUNT_MIN - 1, COIN_AMOUNT_MAX + 1])('відхиляє суму поза межами: %i', (amount) => {
    expect(createCoinTransactionSchema.safeParse({ ...validTransaction, amount }).success).toBe(
      false
    );
  });

  it('відхиляє дробову суму', () => {
    const result = createCoinTransactionSchema.safeParse({ ...validTransaction, amount: 10.5 });
    expect(firstIssue(result)).toBe('Кількість монет має бути цілим числом');
  });

  it('відхиляє закоротку причину', () => {
    const result = createCoinTransactionSchema.safeParse({ ...validTransaction, reason: 'ok' });
    expect(firstIssue(result)).toBe('Причина: не менше 3 символів');
  });

  it('відхиляє невідому категорію', () => {
    const result = createCoinTransactionSchema.safeParse({ ...validTransaction, category: 'gift' });
    expect(firstIssue(result)).toBe('Некоректна категорія');
  });

  it('relatedLessonId необовʼязковий, але має бути UUID', () => {
    expect(
      createCoinTransactionSchema.safeParse({ ...validTransaction, relatedLessonId: UUID.lesson })
        .success
    ).toBe(true);
    expect(
      createCoinTransactionSchema.safeParse({ ...validTransaction, relatedLessonId: '42' }).success
    ).toBe(false);
  });
});

describe('coinFiltersSchema', () => {
  it('приймає порожній фільтр', () => {
    expect(coinFiltersSchema.safeParse({}).success).toBe(true);
  });

  it('відхиляє некоректний studentId', () => {
    expect(coinFiltersSchema.safeParse({ studentId: 'abc' }).success).toBe(false);
  });

  it('без limit бере сторінку за замовчуванням', () => {
    expect(coinFiltersSchema.parse({}).limit).toBe(COIN_HISTORY_DEFAULT_LIMIT);
  });

  // Query-рядок завжди приходить текстом — '50' має стати числом
  it('приводить limit із query-рядка до числа', () => {
    expect(coinFiltersSchema.parse({ limit: '50' }).limit).toBe(50);
  });

  it.each([
    [{ limit: '0' }, 'limit не може бути меншим за 1'],
    [
      { limit: String(COIN_HISTORY_MAX_LIMIT + 1) },
      `limit не може бути більшим за ${COIN_HISTORY_MAX_LIMIT}`,
    ],
    [{ limit: '2.5' }, 'limit має бути цілим числом'],
    [{ cursor: 'last' }, 'cursor має бути UUID транзакції'],
    [{ groupId: 'group-1' }, 'groupId має бути UUID'],
  ])('відхиляє %o', (query, message) => {
    expect(firstIssue(coinFiltersSchema.safeParse(query))).toBe(message);
  });
});

describe('leaderboardFiltersSchema', () => {
  it('підставляє limit за замовчуванням', () => {
    const result = leaderboardFiltersSchema.parse({});
    expect(result.limit).toBe(LEADERBOARD_DEFAULT_LIMIT);
  });

  // query-рядок завжди приходить рядком — без coerce limit ламав би запит
  it('приводить limit із рядка до числа', () => {
    expect(leaderboardFiltersSchema.parse({ limit: '5' }).limit).toBe(5);
  });

  it.each(['0', '101'])('відхиляє limit поза межами: %s', (limit) => {
    expect(leaderboardFiltersSchema.safeParse({ limit }).success).toBe(false);
  });
});
