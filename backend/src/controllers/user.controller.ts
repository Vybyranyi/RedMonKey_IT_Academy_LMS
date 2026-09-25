import { Request, Response } from 'express';
import { createUserSchema, updateUserSchema, userFiltersSchema } from '@redmonkey/shared';
import { userService } from '../services/user.service.js';
import { UnauthorizedError, handleError } from '../utils/errors.js';
import { parseBody, parseIdParam, parseQuery } from '../utils/validation.js';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');

    const filters = parseQuery(userFiltersSchema, req.query);
    const users = await userService.getUsers(filters, req.user);
    res.status(200).json(users);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні користувачів');
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');

    const id = parseIdParam(req.params.id, 'Користувача не знайдено');
    const user = await userService.getUserById(id, req.user);
    res.status(200).json(user);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні користувача');
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = parseBody(createUserSchema, req.body);
    const userResponse = await userService.createUser(data);
    res.status(201).json(userResponse);
  } catch (error) {
    handleError(res, error, 'Помилка при створенні користувача');
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseIdParam(req.params.id, 'Користувача не знайдено');
    const data = parseBody(updateUserSchema, req.body);
    const updatedUser = await userService.updateUser(id, data);
    res.status(200).json(updatedUser);
  } catch (error) {
    handleError(res, error, 'Помилка при оновленні користувача');
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseIdParam(req.params.id, 'Користувача не знайдено');
    await userService.deleteUser(id);
    res.status(200).json({ message: 'Користувач успішно видалений (деактивований)' });
  } catch (error) {
    handleError(res, error, 'Помилка при видаленні користувача');
  }
};

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');
    const stats = await userService.getUserStats(
      parseIdParam(req.params.id, 'Користувача не знайдено'),
      req.user
    );
    res.status(200).json(stats);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні статистики');
  }
};
