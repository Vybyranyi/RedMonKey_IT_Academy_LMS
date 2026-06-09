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
