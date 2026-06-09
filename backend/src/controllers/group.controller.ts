import { Request, Response } from 'express';
import { Group } from '../models/Group.js';

export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const groups = await Group.find({ isActive: true })
      .populate('teachers', 'firstName lastName email')
      .populate('students', 'firstName lastName email');
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні списку груп', error });
  }
};

export const getGroupById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const group = await Group.findOne({ _id: id, isActive: true })
      .populate('teachers', 'firstName lastName email avatar')
      .populate('students', 'firstName lastName email avatar redCoins');

    if (!group) {
      res.status(404).json({ message: 'Групу не знайдено' });
      return;
    }
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні деталей групи', error });
  }
};

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, startDate, endDate, teachers, students } = req.body;

    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      res.status(400).json({ message: 'Група з такою назвою вже існує' });
      return;
    }

    const newGroup = new Group({
      name,
      description,
      startDate,
      endDate,
      teachers: teachers || [],
      students: students || [],
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при створенні групи', error });
  }
};

export const updateGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedGroup) {
      res.status(404).json({ message: 'Групу не знайдено' });
      return;
    }

    res.status(200).json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при оновленні групи', error });
  }
};

export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Замість повного видалення деактивуємо групу
    const group = await Group.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!group) {
      res.status(404).json({ message: 'Групу не знайдено' });
      return;
    }

    res.status(200).json({ message: 'Група успішно видалена (деактивована)' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при видаленні групи', error });
  }
};