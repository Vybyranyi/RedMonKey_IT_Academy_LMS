import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'teacher' | 'student';
  avatar?: string | null;
  phone?: string | null;
  redCoins: number;
  group?: Schema.Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
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