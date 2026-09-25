interface CacheEntry {
  promise: Promise<unknown>;
  expiresAt: number;
}

const entries = new Map<string, CacheEntry>();

/**
 * Кеш для довідкових GET-запитів, які тягнуть кілька сторінок і форм (список
 * груп). Поки запис свіжий, повторний виклик не йде в мережу, а одночасні
 * виклики з тим самим ключем ділять один HTTP-запит.
 *
 * Кешується сам promise, тож усі споживачі отримують один і той самий масив —
 * змінювати його на місці не можна, лише через копію (setState з map/filter).
 * Помилка в кеші не лишається: наступний виклик знову піде в мережу.
 */
export const cachedRequest = <T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> => {
  const hit = entries.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.promise as Promise<T>;

  const promise = fetcher();
  entries.set(key, { promise, expiresAt: Date.now() + ttlMs });
  promise.catch(() => {
    if (entries.get(key)?.promise === promise) entries.delete(key);
  });
  return promise;
};

/** Після мутації: наступний виклик із цим ключем прочитає свіжі дані. */
export const invalidateCache = (key: string) => {
  entries.delete(key);
};

/** Логін і логаут: дані попереднього користувача не мають дістатися наступному. */
export const clearCache = () => {
  entries.clear();
};
