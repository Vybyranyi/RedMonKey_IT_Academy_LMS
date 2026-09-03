import axiosInstance from './axios';
import type { IPopulatedLesson, ILessonDto, ILessonFilters } from '@redmonkey/shared';

export const apiGetLessons = async (filters?: ILessonFilters): Promise<IPopulatedLesson[]> => {
  const response = await axiosInstance.get('/lessons', { params: filters });
  return response.data;
};

export const apiGetLessonById = async (id: string): Promise<IPopulatedLesson> => {
  const response = await axiosInstance.get(`/lessons/${id}`);
  return response.data;
};

export const apiCreateLesson = async (data: ILessonDto): Promise<IPopulatedLesson> => {
  const response = await axiosInstance.post('/lessons', data);
  return response.data;
};

export const apiUpdateLesson = async (id: string, data: Partial<ILessonDto>): Promise<IPopulatedLesson> => {
  const response = await axiosInstance.patch(`/lessons/${id}`, data);
  return response.data;
};

/** Бекенд не видаляє заняття фізично, а переводить у статус cancelled. */
export const apiCancelLesson = async (id: string): Promise<IPopulatedLesson> => {
  const response = await axiosInstance.delete(`/lessons/${id}`);
  return response.data;
};
