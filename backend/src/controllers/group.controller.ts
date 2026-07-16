import { Request, Response } from 'express';
import { groupService } from '../services/group.service.js';
import { UnauthorizedError, handleError } from '../utils/errors.js';

export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await groupService.getGroups();
    res.status(200).json(groups);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні списку груп');
  }
};

export const getGroupById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) throw new UnauthorizedError('Авторизація обовʼязкова');

    const id = req.params.id as string;
    const group = await groupService.getGroupById(id, req.user);
    res.status(200).json(group);
  } catch (error) {
    handleError(res, error, 'Помилка при отриманні деталей групи');
  }
};

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const newGroup = await groupService.createGroup(req.body);
    res.status(201).json(newGroup);
  } catch (error) {
    handleError(res, error, 'Помилка при створенні групи');
  }
};

export const updateGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updatedGroup = await groupService.updateGroup(id, req.body);
    res.status(200).json(updatedGroup);
  } catch (error) {
    handleError(res, error, 'Помилка при оновленні групи');
  }
};

export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await groupService.deleteGroup(id);
    res.status(200).json({ message: 'Група успішно видалена (деактивована)' });
  } catch (error) {
    handleError(res, error, 'Помилка при видаленні групи');
  }
};
