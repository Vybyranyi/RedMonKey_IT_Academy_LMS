/** id текстового повідомлення про помилку поля — на нього посилається aria-describedby. */
export const errorId = (name: string) => `${name}-error`;

/**
 * aria-атрибути поля з помилкою: скрінрідер чує «недійсне» і сам текст помилки,
 * а не лише бачить червону рамку. Без помилки — порожній об'єкт.
 */
export const errorA11y = (name: string, hasError: unknown) =>
  hasError ? { 'aria-invalid': true as const, 'aria-describedby': errorId(name) } : {};
