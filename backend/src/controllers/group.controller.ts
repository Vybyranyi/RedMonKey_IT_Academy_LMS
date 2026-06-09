import { Request, Response } from 'express';
import { groupService } from '../services/group.service.js';

export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await groupService.getGroups();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні списку груп', error });
  }
};

export const getGroupById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const group = await groupService.getGroupById(id);
    res.status(200).json(group);
  } catch (error: any) {
    if (error.message === 'Групу не знайдено') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Помилка при отриманні деталей групи', error });
    }
  }
};

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const newGroup = await groupService.createGroup(req.body);
    res.status(201).json(newGroup);
  } catch (error: any) {
    if (error.message === 'Група з такою назвою вже існує') {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Помилка при створенні групи', error });
    }
  }
};

export const updateGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const updatedGroup = await groupService.updateGroup(id, req.body);
    res.status(200).json(updatedGroup);
  } catch (error: any) {
    if (error.message === 'Групу не знайдено') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Помилка при оновленні групи', error });
    }
  }
};

export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await groupService.deleteGroup(id);
    res.status(200).json({ message: 'Група успішно видалена (деактивована)' });
  } catch (error: any) {
    if (error.message === 'Групу не знайдено') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Помилка при видаленні групи', error });
    }
  }
};