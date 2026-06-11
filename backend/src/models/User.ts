import { Schema, model, Document, Types } from 'mongoose';
import { IUser, UserRole } from '@redmonkey/shared';

export interface IUserDocument extends Document, Omit<IUser, '_id' | 'createdAt' | 'updatedAt' | 'group'> {
  passwordHash: string;
  group?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
    avatar: { type: String, default: null },
    phone: { type: String, default: null },
    redCoins: { type: Number, default: 0 },
    group: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);


UserSchema.index({ role: 1 });

export const User = model<IUserDocument>('User', UserSchema);