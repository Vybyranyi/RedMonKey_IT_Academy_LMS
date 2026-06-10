import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository.js';
import { UserRole } from '@redmonkey/shared';

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

    // Не повертаємо хеш пароля у відповіді
    const userResponse = newUser.toObject();
    delete (userResponse as any).passwordHash;

    return userResponse;
  },

  async updateUser(id: string, updateBody: any) {
    const { password, ...updateData } = updateBody;

    // Якщо адміністратор хоче оновити пароль користувачу
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await userRepository.update(id, updateData);
    if (!updatedUser) {
      throw new Error('Користувача не знайдено');
    }

    return updatedUser;
  },

  async deleteUser(id: string) {
    const user = await userRepository.deactivate(id);
    if (!user) {
      throw new Error('Користувача не знайдено');
    }
    return user;
  }
};
