import axiosInstance from './axios';
import type { IPopulatedGroup, IGroupDto } from '@redmonkey/shared';

export const apiGetGroups = async (): Promise<IPopulatedGroup[]> => {
  const response = await axiosInstance.get('/groups');
  return response.data;
};

export const apiGetGroupById = async (id: string): Promise<IPopulatedGroup> => {
  const response = await axiosInstance.get(`/groups/${id}`);
  return response.data;
};

export const apiCreateGroup = async (data: IGroupDto): Promise<IPopulatedGroup> => {
  const response = await axiosInstance.post('/groups', data);
  return response.data;
};

export const apiUpdateGroup = async (id: string, data: IGroupDto): Promise<IPopulatedGroup> => {
  const response = await axiosInstance.patch(`/groups/${id}`, data);
  return response.data;
};

export const apiDeleteGroup = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/groups/${id}`);
};