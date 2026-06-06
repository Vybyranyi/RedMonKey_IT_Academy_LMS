import { Schema, model, Document } from 'mongoose';
import { IUserBase, UserRole } from '@redmonkey/shared';

export interface IUser extends Document, IUserBase {
  passwordHash: string;
  group?: Schema.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
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


UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

export const User = model<IUser>('User', UserSchema);