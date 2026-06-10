import { groupRepository } from '../repositories/group.repository.js';
import { IGroupDocument } from '../models/Group.js';

export const groupService = {
  async getGroups() {
    return groupRepository.findAllActive();
  },

  async getGroupById(id: string) {
    const group = await groupRepository.findByIdActive(id);
    if (!group) {
      throw new Error('Групу не знайдено');
    }
    return group;
  },

  async createGroup(groupData: Partial<IGroupDocument>) {
    if (groupData.name) {
      const existingGroup = await groupRepository.findByName(groupData.name);
      if (existingGroup) {
        throw new Error('Група з такою назвою вже існує');
      }
    }

    return groupRepository.create({
      ...groupData,
      teachers: groupData.teachers || [],
      students: groupData.students || [],
    });
  },

  async updateGroup(id: string, groupData: Partial<IGroupDocument>) {
    const updatedGroup = await groupRepository.update(id, groupData);
    if (!updatedGroup) {
      throw new Error('Групу не знайдено');
    }
    return updatedGroup;
  },

  async deleteGroup(id: string) {
    const group = await groupRepository.deactivate(id);
    if (!group) {
      throw new Error('Групу не знайдено');
    }
    return group;
  }
};
