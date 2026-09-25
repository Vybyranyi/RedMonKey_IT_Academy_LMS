import { describe, expect, it } from 'vitest';
import { generateRandomPassword, transliterate } from '../stringUtils';

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
