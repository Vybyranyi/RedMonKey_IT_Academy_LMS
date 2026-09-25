/**
 * Оптимістичні оновлення: зміна одразу потрапляє в локальний стан, запит іде
 * у фоні, а при помилці стан відкочується. Хелпери нижче міняють масив точково —
 * решта записів лишаються тими самими об'єктами, і React.memo рядків, яких зміна
 * не стосується, пропускає їхній перерендер.
 */

/** Запис, який уже видно в UI, але сервер його ще не підтвердив. */
export type Pending<T> = T & { isPending?: boolean };

let tempSequence = 0;

/**
 * Тимчасовий id до відповіді сервера. Не crypto.randomUUID: той доступний лише
 * в захищеному контексті (HTTPS або localhost), а для унікальності в межах
 * вкладки вистачає лічильника.
 */
export const createTempId = () => {
  tempSequence += 1;
  return `pending-${tempSequence}`;
};

export const replaceById = <T extends { id: string }>(items: T[], id: string, next: T): T[] =>
  items.map((item) => (item.id === id ? next : item));

export const removeById = <T extends { id: string }>(items: T[], id: string): T[] =>
  items.filter((item) => item.id !== id);

/** Злити відповідь сервера: наявні записи замінити за id, нові дописати в кінець. */
export const upsertById = <T extends { id: string }>(items: T[], updates: T[]): T[] => {
  const updatesById = new Map(updates.map((update) => [update.id, update]));
  const existingIds = new Set(items.map((item) => item.id));

  return [
    ...items.map((item) => updatesById.get(item.id) ?? item),
    ...updates.filter((update) => !existingIds.has(update.id)),
  ];
};
