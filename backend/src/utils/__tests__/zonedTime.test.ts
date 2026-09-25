import { describe, expect, it } from 'vitest';
import { todayIn, zonedTime } from '../zonedTime.js';

const KYIV = 'Europe/Kyiv';

describe('zonedTime', () => {
  it('18:00 у Києві влітку — 15:00 UTC', () => {
    expect(zonedTime(KYIV, 2026, 8, 25, 18).toISOString()).toBe('2026-09-25T15:00:00.000Z');
  });

  it('18:00 у Києві взимку — 16:00 UTC', () => {
    expect(zonedTime(KYIV, 2026, 11, 1, 18).toISOString()).toBe('2026-12-01T16:00:00.000Z');
  });

  // 25 жовтня 2026 о 04:00 Київ переводить годинник з +3 на +2
  it('у день переходу на зимовий час бере вже новий зсув', () => {
    expect(zonedTime(KYIV, 2026, 9, 25, 18).toISOString()).toBe('2026-10-25T16:00:00.000Z');
  });

  it('день понад кінець місяця переносить на наступний, як Date.UTC', () => {
    expect(zonedTime(KYIV, 2026, 8, 30 + 3, 10).toISOString()).toBe('2026-10-03T07:00:00.000Z');
  });

  it('не залежить від пояса процесу: той самий результат для America/New_York', () => {
    expect(zonedTime('America/New_York', 2026, 8, 25, 18).toISOString()).toBe(
      '2026-09-25T22:00:00.000Z'
    );
  });
});

describe('todayIn', () => {
  // 22:30 UTC 25 вересня — у Києві вже 01:30 26-го
  it('бере дату в поясі академії, а не сервера', () => {
    expect(todayIn(KYIV, new Date('2026-09-25T22:30:00Z'))).toEqual({
      year: 2026,
      monthIndex: 8,
      day: 26,
    });
  });
});
