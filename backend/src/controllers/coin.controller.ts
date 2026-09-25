import { Request, Response } from 'express';
import {
  coinFiltersSchema,
  createCoinTransactionSchema,
  leaderboardFiltersSchema,
} from '@redmonkey/shared';
import { coinService } from '../services/coin.service.js';
import { UnauthorizedError, handleError } from '../utils/errors.js';
import { parseBody, parseIdParam, parseQuery } from '../utils/validation.js';

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const filters = parseQuery(coinFiltersSchema, req.query);
    const transactions = await coinService.getTransactions(filters, req.user);
    res.status(200).json(transactions);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні транзакцій');
  }
};

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const data = parseBody(createCoinTransactionSchema, req.body);
    const transaction = await coinService.createTransaction(data, req.user);
    res.status(201).json(transaction);
  } catch (error) {
    handleError(res, error, 'Помилка при нарахуванні монет');
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const filters = parseQuery(leaderboardFiltersSchema, req.query);
    const leaderboard = await coinService.getLeaderboard(filters, req.user);
    res.status(200).json(leaderboard);
  } catch (error) {
    handleError(res, error, 'Помилка при формуванні рейтингу');
  }
};

export const getStudentBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const balance = await coinService.getBalance(
      parseIdParam(req.params.id, 'Студента не знайдено'),
      req.user
    );
    res.status(200).json(balance);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні балансу');
  }
};
