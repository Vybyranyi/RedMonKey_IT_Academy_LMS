import { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { vi } from 'vitest';
import axiosInstance from '../api/axios';

type Handler = (config: InternalAxiosRequestConfig) => unknown;

export const reply = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({
  data,
  status,
  statusText: '',
  headers: new AxiosHeaders(),
  config,
});

/** Відповідь бекенда з помилкою: message потрапляє в toast так само, як у проді. */
export const httpError = (config: InternalAxiosRequestConfig, status: number, message?: string) =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, reply(config, { message }, status));

/** Проміс, який тест розв'язує сам — щоб перевірити стан UI, поки «сервер» думає. */
export const deferred = <T = unknown>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/**
 * Підміняє мережу адаптером axios: ключ — «METHOD /url» або просто «/url»,
 * значення — дані відповіді (або проміс; кинута помилка = помилка запиту).
 * Запит без обробника валить тест: сторінка не має ходити туди, куди не очікуємо.
 */
export const installApi = (routes: Record<string, Handler>) => {
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    const key = `${config.method?.toUpperCase()} ${config.url}`;
    const handler = routes[key] ?? routes[config.url ?? ''];
    if (!handler) throw new Error(`Неочікуваний запит: ${key}`);
    return reply(config, await handler(config));
  });
  axiosInstance.defaults.adapter = adapter as never;
  return adapter;
};

/** Запити адаптера з цим методом і URL — щоб перевірити, що сторінка не перезапитує зайве. */
export const callsTo = (adapter: ReturnType<typeof installApi>, method: string, url: string) =>
  adapter.mock.calls
    .map(([config]) => config)
    .filter((config) => config.method?.toUpperCase() === method && config.url === url);
