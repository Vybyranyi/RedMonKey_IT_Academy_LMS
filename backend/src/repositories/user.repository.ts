import { User, IUserDocument } from '../models/User.js';

export const userRepository = {
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email });
  },

  async findById(id: string): Promise<IUserDocument | null> {
    return User.findById(id);
  }
};
