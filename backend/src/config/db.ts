import { prisma } from '../lib/prisma.js';

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('[database]: PostgreSQL connected (Prisma)');
  } catch (error) {
    console.error(`[error]: Database connection failed:`, error);
    process.exit(1);
  }
};
