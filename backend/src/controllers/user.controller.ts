import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { UnauthorizedError, handleError } from '../utils/errors.js';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getUsers(req.query, req.user?.role);
    res.status(200).json(users);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні користувачів');
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');

    const id = req.params.id as string;
    const user = await userService.getUserById(id, req.user);
    res.status(200).json(user);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні користувача');
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userResponse = await userService.createUser(req.body);
    res.status(201).json(userResponse);
  } catch (error) {
    handleError(res, error, 'Помилка при створенні користувача');
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updatedUser = await userService.updateUser(id, req.body);
    res.status(200).json(updatedUser);
  } catch (error) {
    handleError(res, error, 'Помилка при оновленні користувача');
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await userService.deleteUser(id);
    res.status(200).json({ message: 'Користувач успішно видалений (деактивований)' });
  } catch (error) {
    handleError(res, error, 'Помилка при видаленні користувача');
  }
};
