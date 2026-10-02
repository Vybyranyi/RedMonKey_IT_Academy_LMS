import { describe, expect, it } from 'vitest';
import { navigationItems } from '../../components/layout/navigation';
import { ATTENDANCE_STATUS_META } from '../attendanceStatuses';
import { COIN_CATEGORY_META, getAmountColor } from '../coinCategories';
import { LESSON_STATUS_META } from '../lessonStatuses';
import { LESSON_TYPE_META } from '../lessonTypes';

const BRAND_RED = /#C10000/i;

describe('семантичні кольори', () => {
  // Брендовий червоний — це головні дії й помилки. Іспит, відсутність, скасоване заняття
  // й списання ним позначались теж, і червоне на екрані переставало щось означати
  it('типи й статуси занять, явка, категорії й списання монет — не брендовим червоним', () => {
    const classes = [
      ...Object.values(LESSON_TYPE_META).flatMap((meta) => [meta.dot, meta.event]),
      ...Object.values(LESSON_STATUS_META).map((meta) => meta.badge),
      ...Object.values(ATTENDANCE_STATUS_META).flatMap((meta) => [meta.active, meta.badge]),
      ...Object.values(COIN_CATEGORY_META).map((meta) => meta.badge),
      getAmountColor(-5),
    ];

    expect(classes.filter((value) => BRAND_RED.test(value))).toEqual([]);
  });
});

describe('навігація', () => {
  it('кожен розділ має свою іконку і українську назву', () => {
    const icons = navigationItems.map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
    expect(
      navigationItems.map((item) => item.name).filter((name) => /[A-Za-z]/.test(name))
    ).toEqual(['RedCoins']);
  });
});
