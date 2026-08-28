import { ZodType } from "zod";
import { BadRequestError } from "./errors.js";

/**
 * Єдина точка входу для валідації тіла запиту: помилку Zod згортаємо
 * у BadRequestError, який handleError віддасть як 400 з людським текстом.
 * Без цього невалідний ввід доходить до Prisma і повертається як 500.
 */
export const parseBody = <T>(schema: ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const [issue] = result.error.issues;
    throw new BadRequestError(issue?.message ?? "Некоректні дані запиту");
  }
  return result.data;
};

/** Те саме, що parseBody, але для query-рядка: ?from=...&groupId=... */
export const parseQuery = <T>(schema: ZodType<T>, query: unknown): T =>
  parseBody(schema, query);
