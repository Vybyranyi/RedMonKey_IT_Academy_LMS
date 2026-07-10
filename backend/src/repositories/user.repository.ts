import { User, IUserDocument } from '../models/User.js';

/** Поля, які ніколи не залишають бекенд. */
const PRIVATE_FIELDS = '-passwordHash -tokenVersion';

export const userRepository = {
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email });
  },

  async findById(id: string): Promise<IUserDocument | null> {
    return User.findById(id);
  },

  async findAll(filter: any): Promise<IUserDocument[]> {
    return User.find(filter)
      .select(PRIVATE_FIELDS)
      .populate('group', 'name');
  },

  async findByIdActive(id: string): Promise<IUserDocument | null> {
    return User.findOne({ _id: id, isActive: true })
      .select(PRIVATE_FIELDS)
      .populate('group', 'name');
  },

  async create(userData: Partial<IUserDocument>): Promise<IUserDocument> {
    const newUser = new User(userData);
    return newUser.save();
  },

  async update(id: string, updateData: any): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select(PRIVATE_FIELDS);
  },

  async deactivate(id: string): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, { isActive: false }, { new: true });
  },

  /** Відкликає всі раніше видані refresh-токени користувача. */
  async incrementTokenVersion(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { $inc: { tokenVersion: 1 } });
  }
};
