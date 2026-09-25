import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import { SessionExpiredError } from '../../utils/apiError';
import axiosInstance from '../axios';

vi.mock('sonner', () => ({ toast: { warning: vi.fn(), error: vi.fn() } }));

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

/** Відповідь бекенда на POST /auth/refresh з протухлою чи відкликаною кукою */
const refreshRejected = () =>
  failure({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig, 401);

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
  vi.mocked(toast.warning).mockClear();
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
    const post = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { accessToken: 'fresh-token' } });
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
    const post = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { accessToken: 'fresh-token' } });
    script = ['unauthorized', 'unauthorized', 'ok', 'ok'];

    const results = await Promise.all([axiosInstance.get('/a'), axiosInstance.get('/b')]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(results.map((item) => item.data)).toEqual([{ ok: true }, { ok: true }]);
  });

  it('після невдалого рефрешу розлогінює користувача з одним toast', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(refreshRejected());
    script = ['unauthorized'];

    await expect(axiosInstance.get('/users')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  // Сторінка шле кілька запитів паралельно — сесія має завершитись один раз
  it('кілька одночасних 401 з відкликаним refresh дають один рефреш і один toast', async () => {
    const post = vi.spyOn(axios, 'post').mockRejectedValue(refreshRejected());
    script = ['unauthorized', 'unauthorized', 'unauthorized'];

    const results = await Promise.allSettled([
      axiosInstance.get('/a'),
      axiosInstance.get('/b'),
      axiosInstance.get('/c'),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(
      results.every(
        (result) => result.status === 'rejected' && result.reason instanceof SessionExpiredError
      )
    ).toBe(true);
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  // Запит, що летів до логауту, повертає 401 уже після нього: без цієї
  // перевірки він запустив би новий рефреш — і нове коло 401 → refresh → 401
  it('не рефрешить, якщо сесію вже завершено', async () => {
    const post = vi.spyOn(axios, 'post');
    useAuthStore.getState().clearAuth();
    script = ['unauthorized'];

    await expect(axiosInstance.get('/users')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(post).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  // Сервер недоступний — це ще не протухла сесія: refresh-кука може бути дійсною
  it('не розлогінює, якщо рефреш упав через мережу', async () => {
    const networkError = new AxiosError('Network Error', 'ERR_NETWORK');
    vi.spyOn(axios, 'post').mockRejectedValue(networkError);
    script = ['unauthorized'];

    await expect(axiosInstance.get('/users')).rejects.toBe(networkError);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(toast.warning).not.toHaveBeenCalled();
  });

  // Інакше «Невірний email або пароль» підмінявся б помилкою рефрешу
  it('401 від логіну віддає як є, без рефрешу', async () => {
    const post = vi.spyOn(axios, 'post');
    useAuthStore.getState().clearAuth();
    script = ['unauthorized'];

    const error = await axiosInstance.post('/auth/login', {}).catch((reason) => reason);

    expect(error).toBeInstanceOf(AxiosError);
    expect(error.response.status).toBe(401);
    expect(post).not.toHaveBeenCalled();
  });

  // Якщо після рефрешу знову 401, повторювати немає сенсу — інакше нескінченний цикл
  it('не повторює запит удруге, якщо 401 повернувся після рефрешу', async () => {
    const post = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { accessToken: 'fresh-token' } });
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
