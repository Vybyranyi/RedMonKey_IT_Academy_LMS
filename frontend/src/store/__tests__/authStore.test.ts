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

  // Токен у localStorage читає будь-який XSS, тож зберігається лише прапорець сесії
  it('не пише токен у localStorage, лише прапорець сесії', () => {
    useAuthStore.getState().setAuth(user, 'token-1');

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('hasSession')).toBe('1');
    expect(JSON.stringify({ ...localStorage })).not.toContain('token-1');
  });
});

describe('clearAuth', () => {
  it('скидає стан і прибирає прапорець сесії зі сховища', () => {
    useAuthStore.getState().setAuth(user, 'token-1');

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
    expect(localStorage.getItem('hasSession')).toBeNull();
  });
});

describe('updateAccessToken', () => {
  it('замінює токен, не чіпаючи користувача', () => {
    useAuthStore.getState().setAuth(user, 'token-1');

    useAuthStore.getState().updateAccessToken('token-2');

    expect(useAuthStore.getState().accessToken).toBe('token-2');
    expect(useAuthStore.getState().user).toEqual(user);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});

describe('відновлення сесії', () => {
  it("піднімає isAuthenticated із прапорця, але токена в пам'яті ще немає", async () => {
    localStorage.setItem('hasSession', '1');
    vi.resetModules();

    const { useAuthStore: freshStore } = await import('../authStore');

    expect(freshStore.getState()).toMatchObject({ accessToken: null, isAuthenticated: true });
  });

  it('прибирає токен, який лишила стара версія застосунку', async () => {
    localStorage.setItem('accessToken', 'old-token');
    vi.resetModules();

    const { useAuthStore: freshStore } = await import('../authStore');

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(freshStore.getState().isAuthenticated).toBe(false);
  });

  it('без прапорця стартує неавторизованим', async () => {
    vi.resetModules();

    const { useAuthStore: freshStore } = await import('../authStore');

    expect(freshStore.getState().isAuthenticated).toBe(false);
  });
});
