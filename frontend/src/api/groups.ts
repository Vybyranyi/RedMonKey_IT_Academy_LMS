import axiosInstance from './axios';
import type { IUser } from '@redmonkey/shared';

export interface GroupData {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  teachers?: string[];
  students?: string[];
}

export interface GroupItem {
  _id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  teachers: IUser[];
  students: IUser[];
  isActive: boolean;
}

export const apiGetGroups = async (): Promise<GroupItem[]> => {
  const response = await axiosInstance.get('/groups');
  return response.data;
};

export const apiGetGroupById = async (id: string): Promise<GroupItem> => {
  const response = await axiosInstance.get(`/groups/${id}`);
  return response.data;
};

export const apiCreateGroup = async (data: GroupData): Promise<GroupItem> => {
  const response = await axiosInstance.post('/groups', data);
  return response.data;
};

export const apiUpdateGroup = async (id: string, data: GroupData): Promise<GroupItem> => {
  const response = await axiosInstance.patch(`/groups/${id}`, data);
  return response.data;
};

export const apiDeleteGroup = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/groups/${id}`);
};