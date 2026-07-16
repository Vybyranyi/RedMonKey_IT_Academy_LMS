import { PrismaClient } from '@prisma/client';

/**
 * Єдиний екземпляр PrismaClient на процес.
 * Увесь доступ до БД проходить сюди — це шов, у який пізніше додається
 * RLS-обгортка withUser() (SET LOCAL app.current_user_id) без рефакторингу решти коду.
 */
export const prisma = new PrismaClient();
