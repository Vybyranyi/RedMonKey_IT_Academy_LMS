import { Group, IGroupDocument } from '../models/Group.js';

class GroupRepository {
  async findAllActive(): Promise<IGroupDocument[]> {
    return Group.find({ isActive: true })
      .populate('teachers', 'firstName lastName email')
      .populate('students', 'firstName lastName email');
  }

  async findByIdActive(id: string): Promise<IGroupDocument | null> {
    return Group.findOne({ _id: id, isActive: true })
      .populate('teachers', 'firstName lastName email avatar')
      .populate('students', 'firstName lastName email avatar redCoins');
  }

  async findByName(name: string): Promise<IGroupDocument | null> {
    return Group.findOne({ name });
  }

  async create(groupData: Partial<IGroupDocument>): Promise<IGroupDocument> {
    const newGroup = new Group(groupData);
    return newGroup.save();
  }

  async update(id: string, groupData: Partial<IGroupDocument>): Promise<IGroupDocument | null> {
    return Group.findByIdAndUpdate(
      id,
      groupData,
      { new: true, runValidators: true }
    );
  }

  async deactivate(id: string): Promise<IGroupDocument | null> {
    return Group.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }
}

export const groupRepository = new GroupRepository();
