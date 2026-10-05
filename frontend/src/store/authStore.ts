import { create } from 'zustand';
import type { IUser } from '@redmonkey/shared';
import { clearCache } from '../api/cache';

interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: IUser, accessToken: string) => void;
  clearAuth: () => void;
  updateAccessToken: (token: string) => void;
  setUser: (user: IUser) => void;
}

/**
 * Access-токен живе лише в пам'яті: токен у localStorage читає будь-який XSS.
 * У сховищі лишається нечутливий прапорець «сесія була» — за ним після
 * перезавантаження сторінки застосунок іде за новим токеном через refresh-cookie.
 */
const SESSION_FLAG_KEY = 'hasSession';
const LEGACY_TOKEN_KEY = 'accessToken';

// localStorage може бути недоступний (приватне вікно, заблоковані дані сайту) —
// тоді сесія просто не переживе перезавантаження
const readSessionFlag = () => {
  try {
    // Токен зі старої версії більше не потрібен, а лишати його в сховищі небезпечно
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return localStorage.getItem(SESSION_FLAG_KEY) === '1';
  } catch {
    return false;
  }
};

const writeSessionFlag = (active: boolean) => {
  try {
    if (active) localStorage.setItem(SESSION_FLAG_KEY, '1');
    else localStorage.removeItem(SESSION_FLAG_KEY);
  } catch {
    // не збереглось — після перезавантаження користувач увійде знову
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: readSessionFlag(),
  setAuth: (user, accessToken) => {
    writeSessionFlag(true);
    clearCache();
    set({ user, accessToken, isAuthenticated: true });
  },
  setUser: (user) => set({ user }),
  clearAuth: () => {
    writeSessionFlag(false);
    clearCache();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
  updateAccessToken: (token) => set({ accessToken: token }),
}));
