import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository.js';
import { UserRole } from '@redmonkey/shared';
import { Group } from '../models/Group.js';

export const userService = {
  async getUsers(query: { role?: any; groupId?: any; q?: any }, currentUserRole?: string) {
    const { role, groupId, q } = query;
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
    if (currentUserRole === UserRole.TEACHER) {
      filter.role = UserRole.STUDENT;
    }

    return userRepository.findAll(filter);
  },

  async getUserById(id: string) {
    const user = await userRepository.findByIdActive(id);
    if (!user) {
      throw new Error('Користувача не знайдено');
    }
    return user;
  },

  async createUser(userData: any) {
    const { firstName, lastName, email, password, role, phone, group } = userData;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Користувач з таким email вже існує');
    }

    // Хешування пароля
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'TemporaryPassword123!', salt);

    const newUser = await userRepository.create({
      firstName,
      lastName,
      email,
      passwordHash,
      role,
      phone,
      group: role === UserRole.STUDENT ? group : null,
      redCoins: 0,
    } as any);

    if (role === UserRole.STUDENT && group) {
      await Group.findByIdAndUpdate(group, { $push: { students: newUser._id } });
    }

    // Не повертаємо хеш пароля у відповіді
    const userResponse = newUser.toObject();
    delete (userResponse as any).passwordHash;

    return userResponse;
  },

  async updateUser(id: string, updateBody: any) {
    const { password, ...updateData } = updateBody;

    const oldUser = await userRepository.findById(id);
    if (!oldUser) {
      throw new Error('Користувача не знайдено');
    }

    // Якщо адміністратор хоче оновити пароль користувачу
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await userRepository.update(id, updateData);
    if (!updatedUser) {
      throw new Error('Користувача не знайдено');
    }

    if (updateBody.hasOwnProperty('group') || updateBody.hasOwnProperty('role')) {
      const oldGroupId = oldUser.group?.toString();
      const newGroupId = updatedUser.group?.toString();

      if (oldGroupId !== newGroupId) {
        if (oldGroupId) {
          await Group.findByIdAndUpdate(oldGroupId, { $pull: { students: updatedUser._id } });
        }
        if (newGroupId && updatedUser.role === UserRole.STUDENT) {
          await Group.findByIdAndUpdate(newGroupId, { $push: { students: updatedUser._id } });
        }
      } else if (oldUser.role !== updatedUser.role) {
        // Handle role change but same group
        if (oldUser.role === UserRole.STUDENT && updatedUser.role !== UserRole.STUDENT && oldGroupId) {
          await Group.findByIdAndUpdate(oldGroupId, { $pull: { students: updatedUser._id } });
        } else if (oldUser.role !== UserRole.STUDENT && updatedUser.role === UserRole.STUDENT && newGroupId) {
          await Group.findByIdAndUpdate(newGroupId, { $push: { students: updatedUser._id } });
        }
      }
    }

    return updatedUser;
  },

  async deleteUser(id: string) {
    const user = await userRepository.deactivate(id);
    if (!user) {
      throw new Error('Користувача не знайдено');
    }
    
    if (user.group) {
      await Group.findByIdAndUpdate(user.group, { $pull: { students: user._id } });
    }

    return user;
  }
};
