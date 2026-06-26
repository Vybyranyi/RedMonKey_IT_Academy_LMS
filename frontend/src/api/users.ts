import axiosInstance from './axios';
import type { IUser, IUserDto } from '@redmonkey/shared';

export const apiGetUsers = async (params?: { role?: string; groupId?: string; q?: string }): Promise<IUser[]> => {
  const response = await axiosInstance.get('/users', { params });
  return response.data;
};

export const apiGetUserById = async (id: string): Promise<IUser> => {
  const response = await axiosInstance.get(`/users/${id}`);
  return response.data;
};

export const apiCreateUser = async (data: IUserDto): Promise<IUser> => {
  const response = await axiosInstance.post('/users', data);
  return response.data;
};

export const apiUpdateUser = async (id: string, data: Partial<IUserDto>): Promise<IUser> => {
  const response = await axiosInstance.patch(`/users/${id}`, data);
  return response.data;
};

export const apiDeleteUser = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/users/${id}`);
};
