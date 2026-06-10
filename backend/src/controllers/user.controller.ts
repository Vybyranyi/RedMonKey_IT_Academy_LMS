import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getUsers(req.query, req.user?.role);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні користувачів', error });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = await userService.getUserById(id);
    res.status(200).json(user);
  } catch (error: any) {
    if (error.message === 'Користувача не знайдено') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Помилка при отриманні користувача', error });
    }
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userResponse = await userService.createUser(req.body);
    res.status(201).json(userResponse);
  } catch (error: any) {
    if (error.message === 'Користувач з таким email вже існує') {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Помилка при створенні користувача', error });
    }
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updatedUser = await userService.updateUser(id, req.body);
    res.status(200).json(updatedUser);
  } catch (error: any) {
    if (error.message === 'Користувача не знайдено') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Помилка при оновленні користувача', error });
    }
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await userService.deleteUser(id);
    res.status(200).json({ message: 'Користувач успішно видалений (деактивований)' });
  } catch (error: any) {
    if (error.message === 'Користувача не знайдено') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Помилка при видаленні користувача', error });
    }
  }
};