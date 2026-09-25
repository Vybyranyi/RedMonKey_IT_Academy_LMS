import { env } from './config/env.js';
import { app } from './app.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server]: Server is running on port ${env.port}`);
  });
};

// Якщо БД недоступна, connectDB сам завершує процес — ловити тут нічого
void startServer();
