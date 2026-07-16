import { prisma } from '../lib/prisma.js';

export const academyRepository = {
  /**
   * Id єдиної (наразі) академії. Однотенантна реальність: усі користувачі й групи
   * належать до неї. Коли зʼявиться друга академія — тут підставиться actor.academyId.
   */
  async getDefaultId(): Promise<string> {
    const academy = await prisma.academy.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!academy) {
      throw new Error('Академію не налаштовано в БД. Запустіть `npm run seed`.');
    }
    return academy.id;
  },
};
