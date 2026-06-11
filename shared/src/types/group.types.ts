import type { IUser } from './user.types';

export interface IGroupBase {
  name: string;
  description: string;
  startDate?: Date | string;
  endDate?: Date | string;
  isActive: boolean;
}

export interface IGroup extends IGroupBase {
  _id: string;
  teachers: string[]; // IDs вчителів
  students: string[]; // IDs студентів
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IPopulatedGroup extends Omit<IGroup, 'teachers' | 'students'> {
  teachers: IUser[];
  students: IUser[];
}

export interface IGroupDto extends Partial<IGroupBase> {
  name: string;
  teachers?: string[];
  students?: string[];
}
