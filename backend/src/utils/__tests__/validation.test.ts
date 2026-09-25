import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BadRequestError, NotFoundError } from '../errors.js';
import { parseBody, parseIdParam, parseQuery } from '../validation.js';

const schema = z.object({
  name: z.string().min(2, 'Імʼя закоротке'),
  age: z.coerce.number().int('Вік має бути цілим числом'),
});

describe('parseBody', () => {
  it('повертає розібрані дані', () => {
    expect(parseBody(schema, { name: 'Іван', age: 20 })).toEqual({ name: 'Іван', age: 20 });
  });

  // Без цієї обгортки невалідний ввід доходить до Prisma і повертається як 500
  it('перетворює помилку Zod на BadRequestError', () => {
    expect(() => parseBody(schema, { name: 'І', age: 20 })).toThrow(BadRequestError);
  });

  it('віддає текст першої помилки схеми', () => {
    expect(() => parseBody(schema, { name: 'І', age: 20 })).toThrow('Імʼя закоротке');
  });

  it('має запасний текст, якщо схема не дала повідомлення', () => {
    const bare = z.object({ id: z.string() });
    expect(() => parseBody(bare, {})).toThrow(BadRequestError);
  });
});

describe('parseQuery', () => {
  it('приводить числові параметри з рядка', () => {
    expect(parseQuery(schema, { name: 'Іван', age: '30' })).toEqual({ name: 'Іван', age: 30 });
  });
});

describe('parseIdParam', () => {
  const ID = '11111111-1111-4111-8111-111111111111';

  it('пропускає UUID', () => {
    expect(parseIdParam(ID, 'Групу не знайдено')).toBe(ID);
  });

  // Раніше такий рядок доходив до Prisma, і колонка uuid відповідала 500
  it.each(['abc', '123', `${ID}x`, undefined, [ID]])(
    'на %o відповідає 404 з текстом сутності',
    (id) => {
      expect(() => parseIdParam(id, 'Групу не знайдено')).toThrow(
        new NotFoundError('Групу не знайдено')
      );
    }
  );
});
