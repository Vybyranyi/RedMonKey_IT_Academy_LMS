import { describe, expect, it } from 'vitest';
import { getChangedFields } from '../formUtils';

describe('getChangedFields', () => {
  const initial = { firstName: 'Анна', lastName: 'Коваль', phone: '' };

  it('повертає лише змінені поля', () => {
    expect(getChangedFields(initial, { ...initial, firstName: 'Ганна' })).toEqual({
      firstName: 'Ганна',
    });
  });

  it('повертає порожній обʼєкт, якщо нічого не змінилось', () => {
    expect(getChangedFields(initial, { ...initial })).toEqual({});
  });

  it('збирає кілька змінених полів', () => {
    const changed = getChangedFields(initial, {
      firstName: 'Ганна',
      lastName: 'Коваль',
      phone: '+380671234567',
    });

    expect(changed).toEqual({ firstName: 'Ганна', phone: '+380671234567' });
  });

  // Очищення поля — теж зміна: інакше PATCH ніколи не зміг би стерти телефон
  it('вважає очищення поля зміною', () => {
    expect(getChangedFields({ ...initial, phone: '+380671234567' }, initial)).toEqual({ phone: '' });
  });
});
