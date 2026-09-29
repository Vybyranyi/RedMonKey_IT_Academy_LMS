import bcrypt from 'bcryptjs';
import { UserRole, createUserSchema } from '@redmonkey/shared';
import { prisma } from '../lib/prisma.js';

const ACADEMY_NAME = 'RedMonKey IT Academy';

export type BootstrapResult = 'skipped' | 'exists' | 'created';

/**
 * Перший адмін на порожній базі (прод після деплою). На відміну від seed нічого
 * не стирає і безпечний для повторного запуску: запускається на кожному старті
 * контейнера, але створює адміна лише тоді, коли активного адміна немає зовсім.
 */
export const bootstrapAdmin = async (
  env: Record<string, string | undefined>
): Promise<BootstrapResult> => {
  if (!env.ADMIN_EMAIL?.trim()) {
    return 'skipped';
  }

  // Ті самі правила, що й для POST /users: слабкий пароль чи битий email
  // зупиняють старт з помилкою, а не створюють акаунт тихо
  const data = createUserSchema.omit({ role: true }).parse({
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    firstName: env.ADMIN_FIRST_NAME || 'Адміністратор',
    lastName: env.ADMIN_LAST_NAME || 'Академії',
  });

  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true },
    select: { id: true },
  });
  if (existingAdmin) {
    return 'exists';
  }

  const academy =
    (await prisma.academy.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })) ?? (await prisma.academy.create({ data: { name: ACADEMY_NAME }, select: { id: true } }));

  await prisma.user.create({
    data: {
      academyId: academy.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 10),
      role: UserRole.ADMIN,
    },
    select: { id: true },
  });
  return 'created';
};
