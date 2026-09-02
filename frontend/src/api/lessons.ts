import api from './axios';
import type { IPopulatedLesson } from '@redmonkey/shared';

export const apiGetLessons = async (params?: { from?: string; to?: string }): Promise<IPopulatedLesson[]> => {
  const { data } = await api.get('/lessons', { params });
  return data;
};
