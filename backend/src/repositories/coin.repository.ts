import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const studentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const issuerSelect = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const transactionInclude = {
  student: { select: studentSelect },
  issuer: { select: issuerSelect },
} satisfies Prisma.CoinTransactionInclude;

export const coinRepository = {
  async findAll(where: Prisma.CoinTransactionWhereInput) {
    return prisma.coinTransaction.findMany({
      where,
      include: transactionInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Ledger append-only: запис транзакції і зміна балансу мають статися разом,
   * інакше сума транзакцій розійдеться з User.redCoins. Тому одна транзакція БД.
   * Повертає null, якщо списання завело б баланс у мінус — рішення приймає сервіс.
   */
  async createWithBalance(data: Prisma.CoinTransactionUncheckedCreateInput) {
    return prisma.$transaction(async (tx) => {
      const student = await tx.user.findUnique({
        where: { id: data.studentId },
        select: { redCoins: true },
      });

      if (!student) return null;
      if (student.redCoins + data.amount < 0) return null;

      await tx.user.update({
        where: { id: data.studentId },
        data: { redCoins: { increment: data.amount } },
        select: { id: true },
      });

      return tx.coinTransaction.create({ data, include: transactionInclude });
    });
  },

  /**
   * Таблиця лідерів читається з User.redCoins, а не агрегацією транзакцій:
   * баланс уже матеріалізований у createWithBalance, тож рахувати суму щоразу нема потреби.
   */
  async findLeaderboard(where: Prisma.UserWhereInput, limit: number) {
    return prisma.user.findMany({
      where,
      orderBy: [{ redCoins: 'desc' }, { lastName: 'asc' }],
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        redCoins: true,
        group: { select: { name: true } },
      },
    });
  },

  /** Сума нарахувань і списань окремо — для картки статистики. */
  async sumByDirection(studentId: string) {
    const [earned, spent] = await Promise.all([
      prisma.coinTransaction.aggregate({
        where: { studentId, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      prisma.coinTransaction.aggregate({
        where: { studentId, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
    ]);

    return {
      earned: earned._sum.amount ?? 0,
      spent: Math.abs(spent._sum.amount ?? 0),
    };
  },
};
