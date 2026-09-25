import axiosInstance from './axios';
import type {
  ICoinFilters,
  ICoinTransactionDto,
  ICoinTransactionPage,
  ILeaderboardRow,
  IPopulatedCoinTransaction,
} from '@redmonkey/shared';

/**
 * Одна сторінка історії, новіші першими. Наступну просимо з cursor = nextCursor
 * попередньої відповіді. Бекенд сам звужує вибірку за роллю: студент бачить
 * лише свої транзакції, викладач — лише своїх груп.
 */
export const apiGetCoinTransactions = async (
  filters?: Partial<ICoinFilters>
): Promise<ICoinTransactionPage> => {
  const response = await axiosInstance.get('/coins/transactions', { params: filters });
  return response.data;
};

export const apiCreateCoinTransaction = async (
  data: ICoinTransactionDto
): Promise<IPopulatedCoinTransaction> => {
  const response = await axiosInstance.post('/coins/transactions', data);
  return response.data;
};

/** position уже пораховано на бекенді — фронт його не перераховує. */
export const apiGetLeaderboard = async (params?: {
  groupId?: string;
  limit?: number;
}): Promise<ILeaderboardRow[]> => {
  const response = await axiosInstance.get('/coins/leaderboard', { params });
  return response.data;
};

export interface ICoinBalance {
  studentId: string;
  balance: number;
  earned: number;
  spent: number;
}

export const apiGetStudentBalance = async (studentId: string): Promise<ICoinBalance> => {
  const response = await axiosInstance.get(`/coins/students/${studentId}/balance`);
  return response.data;
};
