import axiosInstance from './axios';
import type { IUser } from '@redmonkey/shared';

export interface UpdateProfileDto {
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export const apiUpdateProfile = async (data: UpdateProfileDto): Promise<IUser> => {
  const response = await axiosInstance.patch('/auth/me', data);
  return response.data;
};

export const apiChangePassword = async (data: ChangePasswordDto): Promise<void> => {
  await axiosInstance.patch('/auth/me/password', data);
};
