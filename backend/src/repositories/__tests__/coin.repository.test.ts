import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { coinRepository } from '../coin.repository.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: { coinTransaction: { findMany: vi.fn(), findUnique: vi.fn() } },
}));

const findMany = vi.mocked(prisma.coinTransaction.findMany);
const findUnique = vi.mocked(prisma.coinTransaction.findUnique);

const rows = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `tx-${i + 1}` }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('coinRepository.findPage', () => {
  // Зайвий рядок — ознака наступної сторінки без окремого COUNT по всьому ledger
  it('просить у БД на один рядок більше за limit', async () => {
    findMany.mockResolvedValue(rows(3) as never);

    await coinRepository.findPage({}, 3);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 4,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
    );
  });

  it('повертає рівно limit рядків і курсор на останній, якщо є продовження', async () => {
    findMany.mockResolvedValue(rows(4) as never);

    const page = await coinRepository.findPage({}, 3);

    expect(page?.items.map((row) => row.id)).toEqual(['tx-1', 'tx-2', 'tx-3']);
    expect(page?.nextCursor).toBe('tx-3');
  });

  it('на останній сторінці віддає nextCursor = null', async () => {
    findMany.mockResolvedValue(rows(3) as never);

    const page = await coinRepository.findPage({}, 3);

    expect(page?.items).toHaveLength(3);
    expect(page?.nextCursor).toBeNull();
  });

  // Keyset: «строго після курсора» в порядку (createdAt desc, id desc).
  // createdAt <= X окремою умовою — щоб Postgres почав скан індексу з курсора
  it('продовжує строго після транзакції-курсора', async () => {
    const createdAt = new Date('2026-09-01T10:00:00.000Z');
    findUnique.mockResolvedValue({ id: 'tx-20', createdAt } as never);
    findMany.mockResolvedValue([] as never);

    await coinRepository.findPage({ studentId: 'student-1' }, 20, 'tx-20');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { studentId: 'student-1' },
            {
              createdAt: { lte: createdAt },
              OR: [{ createdAt: { lt: createdAt } }, { id: { lt: 'tx-20' } }],
            },
          ],
        },
      })
    );
  });

  it('невідомий курсор повертає null і не робить вибірку', async () => {
    findUnique.mockResolvedValue(null as never);

    const page = await coinRepository.findPage({}, 20, 'missing');

    expect(page).toBeNull();
    expect(findMany).not.toHaveBeenCalled();
  });
});
