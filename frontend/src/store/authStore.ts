import { create } from 'zustand';
import type { IUser } from '@redmonkey/shared';

interface AuthState {
    user: IUser | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    setAuth: (user: IUser, accessToken: string) => void;
    clearAuth: () => void;
    updateAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
    clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    updateAccessToken: (token) => set({ accessToken: token }),
}));