import axiosInstance from './axios';
import type { IUser } from '@redmonkey/shared';

export const apiGetUsers = async (params?: { role?: string }): Promise<IUser[]> => {
  const response = await axiosInstance.get('/users', { params });
  return response.data;
};
