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

/** Мінімум для перевірок доступу й бізнес-правил у сервісах — без секретів. */
const userSubjectSelect = {
  id: true,
  role: true,
  groupId: true,
  isActive: true,
  redCoins: true,
} satisfies Prisma.UserSelect;

/**
 * Секрети читають лише ці дві проєкції (плюс updatePassword, що повертає нову
 * tokenVersion) і лише для auth.service. Будь-який інший шлях до passwordHash/
 * tokenVersion — потенційний витік, його ловить repositories/__tests__/secret-fields.test.ts.
 */
const loginUserSelect = {
  ...publicUserSelect,
  passwordHash: true,
  tokenVersion: true,
} satisfies Prisma.UserSelect;

const credentialsSelect = {
  id: true,
  role: true,
  isActive: true,
  passwordHash: true,
  tokenVersion: true,
} satisfies Prisma.UserSelect;

type LoginUser = Prisma.UserGetPayload<{ select: typeof loginUserSelect }>;

/**
 * Дзеркалить publicUserSelect для випадку, коли запис уже прочитано разом із секретами
 * (логін звіряє passwordHash). Тип PublicUser гарантує, що обидва шляхи не розійдуться.
 */
export const toPublicUser = (user: LoginUser): PublicUser => {
  const { passwordHash, tokenVersion, ...publicUser } = user;
  return publicUser;
};

export const userRepository = {
  /** Для логіну: публічний профіль + секрети. Клієнту — лише через toPublicUser. */
  async findCredentialsByEmail(email: string) {
    return prisma.user.findFirst({ where: { email }, select: loginUserSelect });
  },

  /** Для refresh і зміни пароля: tokenVersion і passwordHash без решти профілю. */
  async findCredentialsById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: credentialsSelect });
  },

  async existsByEmail(email: string): Promise<boolean> {
    const user = await prisma.user.findFirst({ where: { email }, select: { id: true } });
    return user !== null;
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: userSubjectSelect });
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
    await prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
      select: { id: true },
    });
  },
};
