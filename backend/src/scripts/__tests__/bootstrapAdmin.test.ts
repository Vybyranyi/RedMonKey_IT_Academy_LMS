import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { bootstrapAdmin } from '../bootstrapAdmin.js';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findFirst: vi.fn(), create: vi.fn() },
    academy: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

const findAdmin = vi.mocked(prisma.user.findFirst);
const createUser = vi.mocked(prisma.user.create);
const findAcademy = vi.mocked(prisma.academy.findFirst);
const createAcademy = vi.mocked(prisma.academy.create);

const ENV = { ADMIN_EMAIL: 'owner@academy.com', ADMIN_PASSWORD: 'Str0ng-Passw0rd' };

beforeEach(() => {
  vi.clearAllMocks();
  findAdmin.mockResolvedValue(null);
  findAcademy.mockResolvedValue({ id: 'academy-1' } as never);
});

describe('bootstrapAdmin', () => {
  it('без ADMIN_EMAIL нічого не робить і не ходить у БД', async () => {
    await expect(bootstrapAdmin({})).resolves.toBe('skipped');
    expect(findAdmin).not.toHaveBeenCalled();
  });

  it('не створює другого адміна, якщо активний уже є', async () => {
    findAdmin.mockResolvedValue({ id: 'admin-1' } as never);

    await expect(bootstrapAdmin(ENV)).resolves.toBe('exists');
    expect(createUser).not.toHaveBeenCalled();
  });

  it('створює адміна з хешем пароля в наявній академії', async () => {
    await expect(bootstrapAdmin(ENV)).resolves.toBe('created');

    expect(createAcademy).not.toHaveBeenCalled();
    const { data } = createUser.mock.calls[0]![0] as {
      data: { email: string; role: string; academyId: string; passwordHash: string };
    };
    expect(data).toMatchObject({ email: ENV.ADMIN_EMAIL, role: 'admin', academyId: 'academy-1' });
    expect(data.passwordHash).not.toBe(ENV.ADMIN_PASSWORD);
    expect(await bcrypt.compare(ENV.ADMIN_PASSWORD, data.passwordHash)).toBe(true);
  });

  it('на порожній базі спершу створює академію', async () => {
    findAcademy.mockResolvedValue(null);
    createAcademy.mockResolvedValue({ id: 'academy-new' } as never);

    await bootstrapAdmin(ENV);

    expect(createAcademy).toHaveBeenCalledOnce();
    expect(createUser.mock.calls[0]![0].data.academyId).toBe('academy-new');
  });

  it('відмовляється від закороткого пароля', async () => {
    await expect(bootstrapAdmin({ ...ENV, ADMIN_PASSWORD: '123' })).rejects.toBeInstanceOf(
      ZodError
    );
    expect(createUser).not.toHaveBeenCalled();
  });

  it('відмовляється без пароля', async () => {
    await expect(bootstrapAdmin({ ADMIN_EMAIL: ENV.ADMIN_EMAIL })).rejects.toBeInstanceOf(ZodError);
  });
});
