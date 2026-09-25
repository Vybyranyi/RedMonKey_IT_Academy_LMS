import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { UserRole } from '@redmonkey/shared';
import { userRepository } from '../repositories/user.repository.js';
import { SALT_ROUNDS } from '../config/constants.js';
import { academyRepository } from '../repositories/academy.repository.js';
import { accessPolicy } from './access.policy.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { TokenPayload } from '../utils/jwt.js';
import { coinRepository } from '../repositories/coin.repository.js';
import { statsRepository } from '../repositories/stats.repository.js';
import type { ICreateUserDto, IUpdateUserDto, IUserFilters, IUserStats } from '@redmonkey/shared';

/**
 * Помилки обмежень БД, які означають некоректний ввід, а не збій сервера:
 * email уже зайнятий (@@unique([academyId, email])) або групи з таким id немає (FK).
 */
const rethrowAsBadRequest = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new BadRequestError('Користувач з таким email вже існує');
    if (error.code === 'P2003') throw new BadRequestError('Вказаної групи не існує');
  }
  throw error;
};

export const userService = {
  async getUsers(filters: IUserFilters, currentUserRole?: UserRole) {
    const { role, groupId, q } = filters;
    const where: Prisma.UserWhereInput = { isActive: true };

    // Викладач бачить лише студентів — це обмеження перекриває будь-який фільтр role.
    if (currentUserRole === UserRole.TEACHER) {
      where.role = UserRole.STUDENT;
    } else if (role) {
      where.role = role;
    }

    if (groupId) {
      where.groupId = groupId;
    }

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
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

  /** Зведена статистика студента: оцінки, монети, відвідуваність (ТЗ 4.2). */
  async getUserStats(id: string, actor: TokenPayload): Promise<IUserStats> {
    const user = await userRepository.findById(id);
    if (!user || !user.isActive) {
      throw new NotFoundError('Користувача не знайдено');
    }

    // Те саме правило, що й на перегляд профілю: адмін, сам користувач
    // або викладач його групи
    const allowed = await accessPolicy.canViewUser(actor, {
      id: user.id,
      role: user.role as UserRole,
      groupId: user.groupId ?? null,
    });
    if (!allowed) {
      throw new ForbiddenError('У вас немає доступу до статистики цього користувача');
    }

    const [grades, attendance, coins] = await Promise.all([
      statsRepository.gradeStats(id),
      statsRepository.attendanceStats(id),
      coinRepository.sumByDirection(id),
    ]);

    return {
      grades,
      attendance,
      coins: { balance: user.redCoins, ...coins },
    };
  },

  // Тіло вже пройшло createUserSchema: поля поза білим списком сюди не доходять
  async createUser(userData: ICreateUserDto) {
    const { firstName, lastName, email, password, role, phone, group } = userData;

    if (await userRepository.existsByEmail(email)) {
      throw new BadRequestError('Користувач з таким email вже існує');
    }

    const academyId = await academyRepository.getDefaultId();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Членство в групі — це FK users.group_id. Жодних масивів для синхронізації.
    return userRepository
      .create({
        academyId,
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        phone: phone ?? null,
        groupId: role === UserRole.STUDENT ? (group ?? null) : null,
        redCoins: 0,
      })
      .catch(rethrowAsBadRequest);
  },

  // rest — лише firstName/lastName/email/phone/avatar/isActive з updateUserSchema.
  // redCoins, tokenVersion, passwordHash тощо схема відкинула ще в контролері.
  async updateUser(id: string, updateBody: IUpdateUserDto) {
    const { password, group, role, ...rest } = updateBody;

    const oldUser = await userRepository.findById(id);
    if (!oldUser) {
      throw new NotFoundError('Користувача не знайдено');
    }

    const data: Prisma.UserUncheckedUpdateInput = { ...rest };
    if (role !== undefined) data.role = role;
    if (password) {
      data.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      // Адмін скидає пароль зазвичай тоді, коли акаунт скомпрометовано. Як і при
      // зміні пароля самим користувачем, відкликаємо всі видані refresh-токени —
      // інакше чужа сесія жила б іще до 7 днів
      data.tokenVersion = { increment: 1 };
    }

    // Перепризначення групи — одне поле FK. Не-студент групи не має.
    if ('group' in updateBody || role !== undefined) {
      const finalRole = (role ?? oldUser.role) as UserRole;
      data.groupId = finalRole === UserRole.STUDENT ? (group ?? null) : null;
    }

    return userRepository.update(id, data).catch(rethrowAsBadRequest);
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
