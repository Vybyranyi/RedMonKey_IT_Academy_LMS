import { Schema, model, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description: string;
  teachers: Schema.Types.ObjectId[];
  students: Schema.Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
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

export const Group = model<IGroup>('Group', GroupSchema);