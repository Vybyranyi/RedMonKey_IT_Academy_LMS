import axiosInstance from './axios';
import type { IPopulatedAttendance, IBulkAttendanceDto, IPopulatedLesson } from '@redmonkey/shared';

export const apiGetAttendance = async (params: { lessonId?: string; studentId?: string }): Promise<IPopulatedAttendance[]> => {
  const response = await axiosInstance.get('/attendance', { params });
  return response.data;
};

export const apiSaveBulkAttendance = async (data: IBulkAttendanceDto): Promise<IPopulatedAttendance[]> => {
  const response = await axiosInstance.post('/attendance/bulk', data);
  return response.data;
};

/** Позначає заняття проведеним і одночасно зберігає явку. */
export const apiCompleteLesson = async (
  lessonId: string,
  records: IBulkAttendanceDto['records']
): Promise<IPopulatedLesson> => {
  const response = await axiosInstance.post(`/lessons/${lessonId}/complete`, { records });
  return response.data;
};
