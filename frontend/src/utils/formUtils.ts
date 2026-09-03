/**
 * PATCH має нести лише змінені поля. Якщо слати форму цілком, кожне збереження
 * перезаписує всі поля тим, що форма показала, — і значення, яке не доїхало з
 * бекенда, тихо затирається порожнім рядком.
 */
export const getChangedFields = <T extends object>(initial: T, values: T): Partial<T> => {
  const changed: Partial<T> = {};

  (Object.keys(values) as (keyof T)[]).forEach((key) => {
    if (values[key] !== initial[key]) {
      changed[key] = values[key];
    }
  });

  return changed;
};
