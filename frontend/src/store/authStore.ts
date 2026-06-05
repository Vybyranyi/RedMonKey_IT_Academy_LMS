import { create } from 'zustand';

export interface UserInfo {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'admin' | 'teacher' | 'student';
    avatar?: string | null;
    redCoins: number;
}

interface AuthState {
    user: UserInfo | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    setAuth: (user: UserInfo, accessToken: string) => void;
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