import { create } from 'zustand';
import type { IUser } from '@redmonkey/shared';

interface AuthState {
    user: IUser | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    setAuth: (user: IUser, accessToken: string) => void;
    clearAuth: () => void;
    updateAccessToken: (token: string) => void;
    setUser: (user: IUser) => void;
}

const storedToken = localStorage.getItem('accessToken');

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    accessToken: storedToken,
    isAuthenticated: !!storedToken,
    setAuth: (user, accessToken) => {
        localStorage.setItem('accessToken', accessToken);
        set({ user, accessToken, isAuthenticated: true });
    },
    setUser: (user) => set({ user }),
    clearAuth: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
    },
    updateAccessToken: (token) => {
        localStorage.setItem('accessToken', token);
        set({ accessToken: token });
    },
}));