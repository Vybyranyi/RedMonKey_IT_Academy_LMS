import { UserRole } from '@redmonkey/shared';
import type { IUser } from '@redmonkey/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../authStore';

const user = { id: 'user-1', role: UserRole.TEACHER } as IUser;

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
});

describe('setAuth', () => {
  it('зберігає користувача й токен у сторі', () => {
    useAuthStore.getState().setAuth(user, 'token-1');

    expect(useAuthStore.getState()).toMatchObject({
      user,
      accessToken: 'token-1',
      isAuthenticated: true,
    });
  });

  // Токен дублюється в localStorage, щоб сесія пережила перезавантаження сторінки
  it('дублює токен у localStorage', () => {
    useAuthStore.getState().setAuth(user, 'token-1');

    expect(localStorage.getItem('accessToken')).toBe('token-1');
  });
});

describe('clearAuth', () => {
  it('скидає стан і прибирає токен зі сховища', () => {
    useAuthStore.getState().setAuth(user, 'token-1');

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});

describe('updateAccessToken', () => {
  it('замінює токен, не чіпаючи користувача', () => {
    useAuthStore.getState().setAuth(user, 'token-1');

    useAuthStore.getState().updateAccessToken('token-2');

    expect(useAuthStore.getState().accessToken).toBe('token-2');
    expect(useAuthStore.getState().user).toEqual(user);
    expect(localStorage.getItem('accessToken')).toBe('token-2');
  });
});

describe('відновлення сесії', () => {
  it('піднімає isAuthenticated із токена в localStorage', async () => {
    localStorage.setItem('accessToken', 'saved-token');
    vi.resetModules();

    const { useAuthStore: freshStore } = await import('../authStore');

    expect(freshStore.getState()).toMatchObject({
      accessToken: 'saved-token',
      isAuthenticated: true,
    });
  });

  it('без збереженого токена стартує неавторизованим', async () => {
    vi.resetModules();

    const { useAuthStore: freshStore } = await import('../authStore');

    expect(freshStore.getState().isAuthenticated).toBe(false);
  });
});
