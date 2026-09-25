import axiosInstance, { type RequestOptions } from './axios';
import { useAuthStore } from '../store/authStore';
import type { IChangePasswordDto, IUpdateProfileDto, IUser } from '@redmonkey/shared';

export const apiGetMe = async ({ signal }: RequestOptions = {}): Promise<IUser> => {
  const response = await axiosInstance.get('/auth/me', { signal });
  return response.data;
};

export const apiUpdateProfile = async (data: IUpdateProfileDto): Promise<IUser> => {
  const response = await axiosInstance.patch('/auth/me', data);
  return response.data;
};

/**
 * Зміна пароля відкликає всі раніше видані refresh-токени, тож бекенд одразу
 * повертає новий access-токен для поточної сесії — його треба зберегти.
 */
export const apiChangePassword = async (data: IChangePasswordDto): Promise<string> => {
  const response = await axiosInstance.patch('/auth/me/password', data);
  return response.data.accessToken;
};

/**
 * Вихід. Локальну сесію завершуємо за будь-якої відповіді сервера: якщо він
 * недоступний, користувач однаково має вийти, а не лишитися «напівзалогіненим».
 */
export const logout = async () => {
  try {
    await axiosInstance.post('/auth/logout');
  } catch (error) {
    console.error('Не вдалося відкликати сесію на сервері', error);
  } finally {
    useAuthStore.getState().clearAuth();
  }
};
