import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.mongoUrl);
    console.log(`[database]: MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[error]: Database connection failed:`, error);
    process.exit(1);
  }
};
