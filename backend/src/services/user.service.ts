import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { UserRole } from '@redmonkey/shared';
import { userRepository } from '../repositories/user.repository.js';
import { SALT_ROUNDS } from '../config/constants.js';
import { academyRepository } from '../repositories/academy.repository.js';
import { accessPolicy } from './access.policy.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { TokenPayload } from '../utils/jwt.js';

export const userService = {
  async getUsers(query: { role?: any; groupId?: any; q?: any }, currentUserRole?: UserRole) {
    const { role, groupId, q } = query;
    const where: Prisma.UserWhereInput = { isActive: true };

    // Викладач бачить лише студентів — це обмеження перекриває будь-який фільтр role.
    if (currentUserRole === UserRole.TEACHER) {
      where.role = UserRole.STUDENT;
    } else if (role && Object.values(UserRole).includes(role as UserRole)) {
      where.role = role as UserRole;
    }

    if (groupId) {
      where.groupId = String(groupId);
    }

    if (q) {
      const term = String(q);
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    return userRepository.findAll(where);
  },

  async getUserById(id: string, actor: TokenPayload) {
    const user = await userRepository.findByIdActive(id);
    if (!user) {
      throw new NotFoundError('Користувача не знайдено');
    }

    const allowed = await accessPolicy.canViewUser(actor, {
      id: user.id,
      role: user.role as UserRole,
      groupId: user.groupId ?? null,
    });
    if (!allowed) {
      throw new ForbiddenError('У вас немає доступу до цього профілю');
    }

    return user;
  },

  async createUser(userData: any) {
    const { firstName, lastName, email, password, role, phone, group } = userData;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new BadRequestError('Користувач з таким email вже існує');
    }

    const academyId = await academyRepository.getDefaultId();
    const passwordHash = await bcrypt.hash(password || 'TemporaryPassword123!', SALT_ROUNDS);

    // Членство в групі — це FK users.group_id. Жодних масивів для синхронізації.
    return userRepository.create({
      academyId,
      firstName,
      lastName,
      email,
      passwordHash,
      role,
      phone: phone ?? null,
      groupId: role === UserRole.STUDENT ? group || null : null,
      redCoins: 0,
    });
  },

  async updateUser(id: string, updateBody: any) {
    const { password, group, role, ...rest } = updateBody;

    const oldUser = await userRepository.findById(id);
    if (!oldUser) {
      throw new NotFoundError('Користувача не знайдено');
    }

    const data: Prisma.UserUncheckedUpdateInput = { ...rest };
    if (role !== undefined) data.role = role;
    if (password) data.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Перепризначення групи — одне поле FK. Не-студент групи не має.
    if ('group' in updateBody || role !== undefined) {
      const finalRole = (role ?? oldUser.role) as UserRole;
      data.groupId = finalRole === UserRole.STUDENT ? group ?? null : null;
    }

    return userRepository.update(id, data);
  },

  async deleteUser(id: string) {
    try {
      return await userRepository.deactivate(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundError('Користувача не знайдено');
      }
      throw error;
    }
  },
};
