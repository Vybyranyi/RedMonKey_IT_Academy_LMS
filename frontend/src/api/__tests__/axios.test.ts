import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import axiosInstance from '../axios';

/**
 * Перевіряємо саму логіку interceptor'а, тому мережу підміняє адаптер axios:
 * кожен крок сценарію описує, що «сервер» відповість на черговий запит.
 */
type Step = 'unauthorized' | 'server-error' | 'ok';

let script: Step[] = [];

const response = (config: InternalAxiosRequestConfig, status: number, data: unknown) => ({
  data,
  status,
  statusText: '',
  headers: new AxiosHeaders(),
  config,
});

const failure = (config: InternalAxiosRequestConfig, status: number) =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response(config, status, {}));

const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
  const step = script.shift() ?? 'ok';
  if (step === 'unauthorized') throw failure(config, 401);
  if (step === 'server-error') throw failure(config, 500);
  return response(config, 200, { ok: true });
});

const authHeaderOf = (callIndex: number) =>
  adapter.mock.calls[callIndex]?.[0]?.headers?.Authorization;

beforeEach(() => {
  script = [];
  adapter.mockClear();
  axiosInstance.defaults.adapter = adapter as never;
  useAuthStore.getState().setAuth({ id: 'user-1' } as never, 'stale-token');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('request interceptor', () => {
  it('додає access-токен у заголовок', async () => {
    script = ['ok'];

    await axiosInstance.get('/users');

    expect(authHeaderOf(0)).toBe('Bearer stale-token');
  });

  it('не додає заголовок, якщо токена немає', async () => {
    useAuthStore.getState().clearAuth();
    script = ['ok'];

    await axiosInstance.get('/users');

    expect(authHeaderOf(0)).toBeUndefined();
  });
});

describe('response interceptor: оновлення токена', () => {
  it('після 401 рефрешить токен і повторює запит', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'fresh-token' } });
    script = ['unauthorized', 'ok'];

    const result = await axiosInstance.get('/users');

    expect(post).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual({ ok: true });
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(authHeaderOf(1)).toBe('Bearer fresh-token');
  });

  it('зберігає новий токен у сторі', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'fresh-token' } });
    script = ['unauthorized', 'ok'];

    await axiosInstance.get('/users');

    expect(useAuthStore.getState().accessToken).toBe('fresh-token');
  });

  // Паралельні запити не мають запускати кілька рефрешів: другий стає в чергу
  it('на кілька одночасних 401 робить лише один рефреш', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'fresh-token' } });
    script = ['unauthorized', 'unauthorized', 'ok', 'ok'];

    const results = await Promise.all([axiosInstance.get('/a'), axiosInstance.get('/b')]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(results.map((item) => item.data)).toEqual([{ ok: true }, { ok: true }]);
  });

  it('після невдалого рефрешу розлогінює користувача', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh failed'));
    script = ['unauthorized'];

    await expect(axiosInstance.get('/users')).rejects.toThrow('refresh failed');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  // Якщо після рефрешу знову 401, повторювати немає сенсу — інакше нескінченний цикл
  it('не повторює запит удруге, якщо 401 повернувся після рефрешу', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'fresh-token' } });
    script = ['unauthorized', 'unauthorized'];

    await expect(axiosInstance.get('/users')).rejects.toBeInstanceOf(AxiosError);
    expect(post).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('помилки, відмінні від 401, прокидає без рефрешу', async () => {
    const post = vi.spyOn(axios, 'post');
    script = ['server-error'];

    await expect(axiosInstance.get('/users')).rejects.toBeInstanceOf(AxiosError);
    expect(post).not.toHaveBeenCalled();
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
