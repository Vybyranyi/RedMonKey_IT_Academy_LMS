import axiosInstance from './axios';
import type {
  GradeType,
  IBulkGradeDto,
  IGradeDto,
  IGradeFilters,
  IGradeSummaryRow,
  IPopulatedGrade,
  IUpdateGradeDto,
} from '@redmonkey/shared';

export const apiGetGrades = async (filters?: IGradeFilters): Promise<IPopulatedGrade[]> => {
  const response = await axiosInstance.get('/grades', { params: filters });
  return response.data;
};

/** Середні бали студентів групи — колонка «Середнє» в журналі. */
export const apiGetGradesSummary = async (params: {
  groupId: string;
  type?: GradeType;
}): Promise<IGradeSummaryRow[]> => {
  const response = await axiosInstance.get('/grades/summary', { params });
  return response.data;
};

export const apiCreateGrade = async (data: IGradeDto): Promise<IPopulatedGrade> => {
  const response = await axiosInstance.post('/grades', data);
  return response.data;
};

export const apiUpdateGrade = async (
  id: string,
  data: IUpdateGradeDto
): Promise<IPopulatedGrade> => {
  const response = await axiosInstance.patch(`/grades/${id}`, data);
  return response.data;
};

export const apiDeleteGrade = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/grades/${id}`);
};

/** Масове виставлення: один тип оцінки за одне заняття для списку студентів. */
export const apiSaveBulkGrades = async (data: IBulkGradeDto): Promise<IPopulatedGrade[]> => {
  const response = await axiosInstance.post('/grades/bulk', data);
  return response.data;
};
