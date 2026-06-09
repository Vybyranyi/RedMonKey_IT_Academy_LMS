import { Schema, model, Document } from 'mongoose';
import { IGroup } from '@redmonkey/shared';

export interface IGroupDocument extends Document, Omit<IGroup, '_id' | 'createdAt' | 'updatedAt' | 'teachers' | 'students'> {
  teachers: Schema.Types.ObjectId[];
  students: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroupDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    teachers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Group = model<IGroupDocument>('Group', GroupSchema);