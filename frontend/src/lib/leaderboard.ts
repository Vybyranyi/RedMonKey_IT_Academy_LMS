import type { ILeaderboardRow } from '@redmonkey/shared';

/**
 * Локально застосувати нарахування (або списання) до рейтингу — без перезапиту.
 * Порядок той самий, що на бекенді (coinRepository.findLeaderboard: redCoins
 * desc, потім прізвище), а позиція — номер рядка після сортування.
 * Студента, якого немає в рейтингу (поза лімітом), не додаємо: його місця
 * серед решти академії ми не знаємо.
 */
export const applyCoinsToLeaderboard = (
  rows: ILeaderboardRow[],
  studentId: string,
  delta: number
): ILeaderboardRow[] => {
  if (!rows.some((row) => row.studentId === studentId)) return rows;

  return rows
    .map((row) => (row.studentId === studentId ? { ...row, redCoins: row.redCoins + delta } : row))
    .sort((a, b) => b.redCoins - a.redCoins || a.lastName.localeCompare(b.lastName, 'uk'))
    .map((row, index) => (row.position === index + 1 ? row : { ...row, position: index + 1 }));
};
