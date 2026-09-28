import { env } from './config/env.js';
import { app } from './app.js';
import { connectDB } from './config/db.js';
import { prisma } from './lib/prisma.js';

const startServer = async () => {
  await connectDB();
  const server = app.listen(env.port, () => {
    console.log(`[server]: Server is running on port ${env.port}`);
  });

  // Docker/Render зупиняють контейнер сигналом SIGTERM. Node у ролі PID 1 без
  // обробника його ігнорує, і через 10-30 с процес просто вбивають (SIGKILL)
  // посеред запитів. Тут дочікуємось поточних запитів і закриваємо пул БД.
  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`[server]: ${signal} received, shutting down`);
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
};

// Якщо БД недоступна, connectDB сам завершує процес — ловити тут нічого
void startServer();
