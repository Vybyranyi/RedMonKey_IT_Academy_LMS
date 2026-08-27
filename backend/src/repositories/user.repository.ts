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

/** Форма користувача, яку бачить клієнт. Одна на login, GET /auth/me і PATCH /auth/me. */
export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

const fullUserInclude = { group: { select: { id: true, name: true } } } satisfies Prisma.UserInclude;

type FullUser = Prisma.UserGetPayload<{ include: typeof fullUserInclude }>;

/**
 * Дзеркалить publicUserSelect для випадків, коли запис уже прочитано повністю
 * (логін читає passwordHash). Тип PublicUser гарантує, що обидва шляхи не розійдуться.
 */
export const toPublicUser = (user: FullUser): PublicUser => {
  const { passwordHash, tokenVersion, ...publicUser } = user;
  return publicUser;
};

export const userRepository = {
  /** Повний запис (з passwordHash/tokenVersion) — лише для внутрішньої логіки auth. */
  async findByEmail(email: string) {
    return prisma.user.findFirst({ where: { email }, include: fullUserInclude });
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

  /**
   * Змінює пароль і тим самим запитом відкликає всі раніше видані refresh-токени.
   * Одна транзакція — щоб не існувало вікна, у якому пароль уже новий, а старі сесії ще живі.
   * Повертає нову tokenVersion, під якою треба випустити токени поточної сесії.
   */
  async updatePassword(id: string, passwordHash: string) {
    const user = await prisma.user.update({
      where: { id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    });
    return user.tokenVersion;
  },

  /** Відкликає всі раніше видані refresh-токени користувача. */
  async incrementTokenVersion(id: string) {
    await prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
  },
};
