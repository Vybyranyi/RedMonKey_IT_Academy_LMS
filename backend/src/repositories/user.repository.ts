import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/** Публічна проєкція: усі поля, крім passwordHash і tokenVersion. */
const publicUserSelect = {
  id: true,
  academyId: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  avatar: true,
  phone: true,
  redCoins: true,
  groupId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  group: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

export const userRepository = {
  /** Повний запис (з passwordHash/tokenVersion) — лише для внутрішньої логіки auth. */
  async findByEmail(email: string) {
    return prisma.user.findFirst({ where: { email } });
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findAll(where: Prisma.UserWhereInput) {
    return prisma.user.findMany({
      where,
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByIdActive(id: string) {
    return prisma.user.findFirst({ where: { id, isActive: true }, select: publicUserSelect });
  },

  async create(data: Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({ data, select: publicUserSelect });
  },

  async update(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return prisma.user.update({ where: { id }, data, select: publicUserSelect });
  },

  async deactivate(id: string) {
    return prisma.user.update({ where: { id }, data: { isActive: false }, select: publicUserSelect });
  },

  /** Відкликає всі раніше видані refresh-токени користувача. */
  async incrementTokenVersion(id: string) {
    await prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
  },
};
