import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { UserRole } from '@redmonkey/shared';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, groupId, q } = req.query;
    const filter: any = { isActive: true };

    // Фільтрація за роллю
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      filter.role = role;
    }

    // Фільтрація за групою
    if (groupId) {
      filter.group = groupId;
    }

    // Текстовий пошук за ім'ям, прізвищем або поштою
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
    }

    // Якщо запит робить викладач, він може бачити лише студентів (безпека)
    if (req.user?.role === UserRole.TEACHER) {
      filter.role = UserRole.STUDENT;
    }

    const users = await User.find(filter)
      .select('-passwordHash')
      .populate('group', 'name');

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні користувачів', error });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, isActive: true })
      .select('-passwordHash')
      .populate('group', 'name');

    if (!user) {
      res.status(404).json({ message: 'Користувача не знайдено' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні користувача', error });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, role, phone, group } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'Користувач з таким email вже існує' });
      return;
    }

    // Хешування пароля
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'TemporaryPassword123!', salt);

    const newUser = new User({
      firstName,
      lastName,
      email,
      passwordHash,
      role,
      phone,
      group: role === UserRole.STUDENT ? group : null,
      redCoins: 0,
    });

    await newUser.save();

    // Не повертаємо хеш пароля у відповіді
    const userResponse = newUser.toObject();
    delete (userResponse as any).passwordHash;

    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при створенні користувача', error });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { password, ...updateData } = req.body;

    // Якщо адміністратор хоче оновити пароль користувачу
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      res.status(404).json({ message: 'Користувача не знайдено' });
      return;
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при оновленні користувача', error });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // М'яке видалення (деактивація)
    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!user) {
      res.status(404).json({ message: 'Користувача не знайдено' });
      return;
    }

    res.status(200).json({ message: 'Користувач успішно видалений (деактивований)' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при видаленні користувача', error });
  }
};