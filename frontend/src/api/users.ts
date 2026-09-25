import axiosInstance, { type RequestOptions } from './axios';
import { invalidateGroupsCache } from './groups';
import type { IUser, IUserDto, IUserStats } from '@redmonkey/shared';

export const apiGetUsers = async (
  params?: { role?: string; groupId?: string; q?: string },
  { signal }: RequestOptions = {}
): Promise<IUser[]> => {
  const response = await axiosInstance.get('/users', { params, signal });
  return response.data;
};

/** Зведена статистика студента для дашборду: оцінки, відвідуваність, монети. */
export const apiGetUserStats = async (
  id: string,
  { signal }: RequestOptions = {}
): Promise<IUserStats> => {
  const response = await axiosInstance.get(`/users/${id}/stats`, { signal });
  return response.data;
};

export const apiGetUserById = async (id: string): Promise<IUser> => {
  const response = await axiosInstance.get(`/users/${id}`);
  return response.data;
};

// Кешований список груп містить їхній склад (студенти, викладачі) — після
// змін користувача він застаріває
export const apiCreateUser = async (data: IUserDto): Promise<IUser> => {
  const response = await axiosInstance.post('/users', data);
  invalidateGroupsCache();
  return response.data;
};

export const apiUpdateUser = async (id: string, data: Partial<IUserDto>): Promise<IUser> => {
  const response = await axiosInstance.patch(`/users/${id}`, data);
  invalidateGroupsCache();
  return response.data;
};

export const apiDeleteUser = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/users/${id}`);
  invalidateGroupsCache();
};
