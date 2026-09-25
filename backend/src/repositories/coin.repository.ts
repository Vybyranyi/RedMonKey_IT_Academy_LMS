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
  /**
   * Сторінка історії, новіші першими. Keyset, а не OFFSET: наступна сторінка
   * починається строго після курсора — рядок, доданий тим часом згори,
   * не зсуває сторінки й не дублюється.
   *
   * Курсор — id останньої транзакції попередньої сторінки. Умову будуємо самі,
   * а не через Prisma `cursor`: та генерує `(created_at = X AND id <= Y) OR created_at < X`,
   * і через OR Postgres не може почати скан індексу з позиції курсора.
   * `created_at <= X` окремою умовою — може. Заміри: backend/prisma/QUERY_PLANS.md.
   *
   * Повертає null, якщо транзакції-курсора не існує.
   */
  async findPage(where: Prisma.CoinTransactionWhereInput, limit: number, cursor?: string) {
    const conditions: Prisma.CoinTransactionWhereInput[] = [where];

    if (cursor) {
      const after = await prisma.coinTransaction.findUnique({
        where: { id: cursor },
        select: { id: true, createdAt: true },
      });
      if (!after) return null;

      conditions.push({
        createdAt: { lte: after.createdAt },
        OR: [{ createdAt: { lt: after.createdAt } }, { id: { lt: after.id } }],
      });
    }

    const rows = await prisma.coinTransaction.findMany({
      where: { AND: conditions },
      include: transactionInclude,
      // id — тай-брейкер: кілька транзакцій можуть мати однаковий created_at
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      // Один зайвий рядок показує, чи є наступна сторінка, без окремого COUNT
      take: limit + 1,
    });

    const items = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? items[items.length - 1]!.id : null;
    return { items, nextCursor };
  },

  /**
   * Ledger append-only: запис транзакції і зміна балансу мають статися разом,
   * інакше сума транзакцій розійдеться з User.redCoins. Тому одна транзакція БД.
   * Повертає null, якщо списання завело б баланс у мінус — рішення приймає сервіс.
   */
  async createWithBalance(data: Prisma.CoinTransactionUncheckedCreateInput) {
    return prisma.$transaction(async (tx) => {
      // Умова балансу — у самому UPDATE, а не в SELECT перед ним. Postgres блокує
      // рядок і перевіряє умову вже на свіжому балансі, тож із двох одночасних
      // списань друге просто не знайде рядка. З окремим SELECT обидва бачили
      // однаковий баланс і обидва проходили — баланс ішов у мінус.
      const { count } = await tx.user.updateMany({
        where: {
          id: data.studentId,
          ...(data.amount < 0 && { redCoins: { gte: -data.amount } }),
        },
        data: { redCoins: { increment: data.amount } },
      });
      if (count === 0) return null;

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
