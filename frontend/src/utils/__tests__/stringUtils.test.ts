import { describe, expect, it } from 'vitest';
import { generateRandomPassword, pluralize, transliterate } from '../stringUtils';

describe('transliterate', () => {
  it('переводить кирилицю в латиницю', () => {
    expect(transliterate('Марія')).toBe('mariia');
  });

  it('обробляє специфічні українські літери', () => {
    expect(transliterate('Щедрий')).toBe('shchedryi');
  });

  // Результат іде в email/логін, тож пробіли, апострофи й дефіси мають зникнути
  it('прибирає все, крім латиниці та цифр', () => {
    expect(transliterate("О'Коннор-2")).toBe('okonnor2');
  });

  it('повертає порожній рядок для порожнього входу', () => {
    expect(transliterate('')).toBe('');
  });

  it('лишає латиницю без змін, але в нижньому регістрі', () => {
    expect(transliterate('Ivan')).toBe('ivan');
  });
});

describe('generateRandomPassword', () => {
  it('має довжину за замовчуванням 10 символів', () => {
    expect(generateRandomPassword()).toHaveLength(10);
  });

  it('поважає задану довжину', () => {
    expect(generateRandomPassword(16)).toHaveLength(16);
  });

  it('містить лише латиницю та цифри', () => {
    expect(generateRandomPassword(50)).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('генерує різні паролі', () => {
    expect(generateRandomPassword(20)).not.toBe(generateRandomPassword(20));
  });
});

describe('pluralize', () => {
  const groups: [string, string, string] = ['група', 'групи', 'груп'];

  it('обирає українську форму за числом', () => {
    expect([0, 1, 2, 4, 5, 11, 21, 22, 25].map((n) => `${n} ${pluralize(n, groups)}`)).toEqual([
      '0 груп',
      '1 група',
      '2 групи',
      '4 групи',
      '5 груп',
      '11 груп',
      '21 група',
      '22 групи',
      '25 груп',
    ]);
  });
});
