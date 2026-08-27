import axiosInstance from './axios';
import type { IChangePasswordDto, IUpdateProfileDto, IUser } from '@redmonkey/shared';

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
