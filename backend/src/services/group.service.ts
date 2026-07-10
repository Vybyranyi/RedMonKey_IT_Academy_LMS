import { groupRepository } from '../repositories/group.repository.js';
import { IGroupDocument } from '../models/Group.js';
import { accessPolicy } from './access.policy.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { TokenPayload } from '../utils/jwt.js';

/** teachers/students приходять populated — витягуємо лише id. */
const toIds = (refs: unknown[]): string[] =>
  refs.map((ref) =>
    typeof ref === 'object' && ref !== null && '_id' in (ref as any)
      ? String((ref as any)._id)
      : String(ref)
  );

export const groupService = {
  async getGroups() {
    return groupRepository.findAllActive();
  },

  async getGroupById(id: string, actor: TokenPayload) {
    const group = await groupRepository.findByIdActive(id);
    if (!group) {
      throw new NotFoundError('Групу не знайдено');
    }

    const allowed = await accessPolicy.canViewGroup(actor, {
      teacherIds: toIds(group.teachers),
      studentIds: toIds(group.students),
    });
    if (!allowed) {
      throw new ForbiddenError('У вас немає доступу до цієї групи');
    }

    return group;
  },

  async createGroup(groupData: Partial<IGroupDocument>) {
    if (groupData.name) {
      const existingGroup = await groupRepository.findByName(groupData.name);
      if (existingGroup) {
        throw new BadRequestError('Група з такою назвою вже існує');
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
      throw new NotFoundError('Групу не знайдено');
    }
    return updatedGroup;
  },

  async deleteGroup(id: string) {
    const group = await groupRepository.deactivate(id);
    if (!group) {
      throw new NotFoundError('Групу не знайдено');
    }
    return group;
  }
};
