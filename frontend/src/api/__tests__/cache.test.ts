import { AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { IUser } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';
import axiosInstance from '../axios';
import { apiCreateGroup, apiGetGroups } from '../groups';
import { apiUpdateUser } from '../users';

let failNext = false;

const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
  if (failNext) {
    failNext = false;
    throw new Error('Network Error');
  }
  return {
    data: config.method === 'get' ? [{ id: `group-${adapter.mock.calls.length}` }] : {},
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
  };
});

const groupRequests = () =>
  adapter.mock.calls.filter(([config]) => config.method === 'get' && config.url === '/groups');

beforeEach(() => {
  failNext = false;
  adapter.mockClear();
  axiosInstance.defaults.adapter = adapter as never;
  // setAuth очищає кеш — кожен тест стартує з порожнього
  useAuthStore.getState().setAuth({ id: 'admin-1' } as IUser, 'token');
});

describe('кеш списку груп', () => {
  // Дашборд, журнал і форма відкриваються майже одночасно — запит має бути один
  it('одночасні виклики ділять один запит', async () => {
    const [first, second] = await Promise.all([apiGetGroups(), apiGetGroups()]);

    expect(groupRequests()).toHaveLength(1);
    expect(second).toBe(first);
  });

  it('повторний виклик у межах TTL не йде в мережу', async () => {
    await apiGetGroups();
    await apiGetGroups();

    expect(groupRequests()).toHaveLength(1);
  });

  it('після TTL читає свіжі дані', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      await apiGetGroups();
      vi.setSystemTime(Date.now() + 61_000);
      await apiGetGroups();
    } finally {
      vi.useRealTimers();
    }

    expect(groupRequests()).toHaveLength(2);
  });

  it('створення групи скидає кеш', async () => {
    await apiGetGroups();
    await apiCreateGroup({ name: 'JS-2026' } as never);
    await apiGetGroups();

    expect(groupRequests()).toHaveLength(2);
  });

  // Склад групи (студенти) змінюється і через /users
  it('зміна користувача скидає кеш', async () => {
    await apiGetGroups();
    await apiUpdateUser('student-1', { firstName: 'Анна' });
    await apiGetGroups();

    expect(groupRequests()).toHaveLength(2);
  });

  // Наступний користувач на тому ж пристрої не має побачити групи попереднього
  it('логаут скидає кеш', async () => {
    await apiGetGroups();
    useAuthStore.getState().clearAuth();
    await apiGetGroups();

    expect(groupRequests()).toHaveLength(2);
  });

  it('помилку не кешує', async () => {
    failNext = true;
    await expect(apiGetGroups()).rejects.toThrow('Network Error');

    await expect(apiGetGroups()).resolves.toHaveLength(1);
    expect(groupRequests()).toHaveLength(2);
  });
});
