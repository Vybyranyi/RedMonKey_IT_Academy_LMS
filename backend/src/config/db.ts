import mongoose from 'mongoose';
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL || '');
    console.log(`[database]: MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[error]: Database connection failed:`, error);
    process.exit(1);
  }
};