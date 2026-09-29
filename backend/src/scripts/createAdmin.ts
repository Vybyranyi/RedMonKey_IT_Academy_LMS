import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { bootstrapAdmin } from './bootstrapAdmin.js';

const MESSAGES = {
  skipped: 'ADMIN_EMAIL не задано — пропускаю',
  exists: 'активний адмін уже є — нічого не змінюю',
  created: 'адміна створено',
} as const;

bootstrapAdmin(process.env)
  .then((result) => console.log(`[create-admin]: ${MESSAGES[result]}`))
  .catch((error: unknown) => {
    console.error('[create-admin]: не вдалося створити адміна:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
