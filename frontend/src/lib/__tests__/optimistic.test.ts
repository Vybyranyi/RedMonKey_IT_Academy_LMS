import type { ILeaderboardRow } from '@redmonkey/shared';
import { describe, expect, it } from 'vitest';
import { applyCoinsToLeaderboard } from '../leaderboard';
import { createTempId, replaceById, upsertById } from '../optimistic';

const item = (id: string, value: number) => ({ id, value });

describe('хелпери оптимістичних оновлень', () => {
  // Саме на збереженні посилань тримається React.memo рядків журналу
  it("replaceById лишає незмінені записи тими самими об'єктами", () => {
    const items = [item('a', 1), item('b', 2)];

    const next = replaceById(items, 'b', item('b', 3));

    expect(next[0]).toBe(items[0]);
    expect(next[1]).toEqual(item('b', 3));
  });

  it('upsertById замінює наявні й дописує нові', () => {
    const items = [item('a', 1), item('b', 2)];

    expect(upsertById(items, [item('b', 5), item('c', 7)])).toEqual([
      item('a', 1),
      item('b', 5),
      item('c', 7),
    ]);
  });

  it('тимчасові id не повторюються', () => {
    expect(createTempId()).not.toBe(createTempId());
  });
});

describe('applyCoinsToLeaderboard', () => {
  const row = (
    studentId: string,
    lastName: string,
    redCoins: number,
    position: number
  ): ILeaderboardRow => ({
    position,
    studentId,
    firstName: 'Студент',
    lastName,
    groupName: 'JS-1',
    redCoins,
  });

  const rows = [
    row('s1', 'Бойко', 30, 1),
    row('s2', 'Антоненко', 20, 2),
    row('s3', 'Шевчук', 10, 3),
  ];

  it('пересортовує рейтинг і перераховує позиції', () => {
    const next = applyCoinsToLeaderboard(rows, 's3', 25);

    expect(next.map((r) => [r.studentId, r.redCoins, r.position])).toEqual([
      ['s3', 35, 1],
      ['s1', 30, 2],
      ['s2', 20, 3],
    ]);
  });

  // Той самий порядок, що на бекенді: redCoins desc, потім прізвище
  it('при рівних балах ставить вище за прізвищем', () => {
    const next = applyCoinsToLeaderboard(rows, 's1', -10);

    expect(next.map((r) => r.lastName)).toEqual(['Антоненко', 'Бойко', 'Шевчук']);
  });

  it('списання відкочує нарахування до того самого стану', () => {
    const next = applyCoinsToLeaderboard(applyCoinsToLeaderboard(rows, 's3', 25), 's3', -25);

    expect(next).toEqual(rows);
  });

  it('студента поза рейтингом не додає', () => {
    expect(applyCoinsToLeaderboard(rows, 'unknown', 100)).toBe(rows);
  });
});
