import { Prisma } from '@prisma/client';
import { groupRepository } from '../repositories/group.repository.js';
import { academyRepository } from '../repositories/academy.repository.js';
import { accessPolicy } from './access.policy.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { TokenPayload } from '../utils/jwt.js';

/** teachers/students приходять як обʼєкти { id, ... } — витягуємо лише id. */
const toIds = (rows: any[]): string[] => rows.map((row) => String(row.id));

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
      teacherIds: toIds(group.teachers as any[]),
      studentIds: toIds(group.students as any[]),
    });
    if (!allowed) {
      throw new ForbiddenError('У вас немає доступу до цієї групи');
    }

    return group;
  },

  async createGroup(groupData: any) {
    const { teachers = [], students, ...rest } = groupData;

    if (rest.name) {
      const existingGroup = await groupRepository.findByName(rest.name);
      if (existingGroup) {
        throw new BadRequestError('Група з такою назвою вже існує');
      }
    }

    const academyId = await academyRepository.getDefaultId();
    return groupRepository.create({ ...rest, academyId }, teachers);
  },

  async updateGroup(id: string, groupData: any) {
    const { teachers, students, ...rest } = groupData;

    let updated;
    try {
      updated = await groupRepository.update(id, rest as Prisma.GroupUncheckedUpdateInput, teachers);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundError('Групу не знайдено');
      }
      throw error;
    }
    if (!updated) {
      throw new NotFoundError('Групу не знайдено');
    }
    return updated;
  },

  async deleteGroup(id: string) {
    try {
      return await groupRepository.deactivate(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundError('Групу не знайдено');
      }
      throw error;
    }
  },
};
