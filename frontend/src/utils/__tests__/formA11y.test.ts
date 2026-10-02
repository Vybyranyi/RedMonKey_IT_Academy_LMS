import { describe, expect, it } from 'vitest';
import { errorA11y, errorId } from '../formA11y';

describe('errorA11y', () => {
  it('з помилкою — aria-invalid і посилання на текст помилки', () => {
    expect(errorA11y('email', 'Некоректний email')).toEqual({
      'aria-invalid': true,
      'aria-describedby': errorId('email'),
    });
  });

  it('без помилки — нічого не додає', () => {
    expect(errorA11y('email', undefined)).toEqual({});
    expect(errorA11y('email', false)).toEqual({});
  });
});
