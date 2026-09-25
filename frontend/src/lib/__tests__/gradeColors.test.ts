import { GradeType } from '@redmonkey/shared';
import { describe, expect, it } from 'vitest';
import { GRADE_TYPE_META, getAverageColor, getGradeColor } from '../gradeColors';

// Кольорове кодування з ТЗ 6.2: 10–12 зелений, 7–9 синій, 4–6 жовтий, 1–3 червоний
describe('getGradeColor', () => {
  it.each([
    [12, 'emerald'],
    [10, 'emerald'],
    [9, 'blue'],
    [7, 'blue'],
    [6, 'amber'],
    [4, 'amber'],
    [3, 'rose'],
    [1, 'rose'],
  ])('оцінка %i потрапляє в палітру %s', (value, palette) => {
    expect(getGradeColor(value)).toContain(palette);
  });

  it('межі діапазонів не перетинаються', () => {
    expect(getGradeColor(9)).not.toBe(getGradeColor(10));
    expect(getGradeColor(6)).not.toBe(getGradeColor(7));
    expect(getGradeColor(3)).not.toBe(getGradeColor(4));
  });
});

describe('getAverageColor', () => {
  // average === null означає «оцінок ще немає» — це не те саме, що нуль
  it('для відсутнього середнього дає нейтральний колір', () => {
    expect(getAverageColor(null)).toContain('slate');
  });

  it('округлює середнє перед вибором кольору', () => {
    expect(getAverageColor(9.5)).toBe(getGradeColor(10));
    expect(getAverageColor(9.4)).toBe(getGradeColor(9));
  });
});

describe('GRADE_TYPE_META', () => {
  it('має підпис для кожного типу оцінки', () => {
    Object.values(GradeType).forEach((type) => {
      expect(GRADE_TYPE_META[type].label).toBeTruthy();
    });
  });
});
