import { z, ZodType } from 'zod';
import { BadRequestError, NotFoundError } from './errors.js';

/**
 * Єдина точка входу для валідації тіла запиту: помилку Zod згортаємо
 * у BadRequestError, який handleError віддасть як 400 з людським текстом.
 * Без цього невалідний ввід доходить до Prisma і повертається як 500.
 */
export const parseBody = <T>(schema: ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const [issue] = result.error.issues;
    throw new BadRequestError(issue?.message ?? 'Некоректні дані запиту');
  }
  return result.data;
};

/** Те саме, що parseBody, але для query-рядка: ?from=...&groupId=... */
export const parseQuery = <T>(schema: ZodType<T>, query: unknown): T => parseBody(schema, query);

const uuid = z.uuid();

/**
 * :id з URL. Рядок, що не є UUID, Prisma на колонці uuid зустрічає помилкою P2023,
 * і handleError віддавав її як 500. Запису з таким id бути не може — відповідаємо
 * тим самим 404, що й на неіснуючий id.
 */
export const parseIdParam = (id: unknown, notFoundMessage: string): string => {
  if (!uuid.safeParse(id).success) throw new NotFoundError(notFoundMessage);
  return id as string;
};
