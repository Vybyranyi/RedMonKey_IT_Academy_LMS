import { Prisma } from '@prisma/client';
import { UserRole } from '@redmonkey/shared';
import type { ICreateGroupDto, IUpdateGroupDto } from '@redmonkey/shared';
import { groupRepository } from '../repositories/group.repository.js';
import { academyRepository } from '../repositories/academy.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { accessPolicy } from './access.policy.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { TokenPayload } from '../utils/jwt.js';

/** teachers/students приходять як обʼєкти { id, ... } — витягуємо лише id. */
const toIds = (rows: any[]): string[] => rows.map((row) => String(row.id));

const isPrismaError = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

/**
 * Викладачами групи можуть бути лише активні користувачі з роллю teacher.
 * Без цього неіснуючий id падав би на FK як 500, а id студента тихо ставав би
 * «викладачем» групи. Дублікатів у списку немає — їх відсіює схема групи.
 */
const assertActiveTeachers = async (teacherIds: string[]) => {
  if (teacherIds.length === 0) return;

  const teachers = await userRepository.findAll({
    id: { in: teacherIds },
    role: UserRole.TEACHER,
    isActive: true,
  });
  if (teachers.length !== teacherIds.length) {
    throw new BadRequestError('Серед teachers є id, які не належать активним викладачам');
  }
};

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

  // Тіло вже пройшло createGroupSchema: id, academyId, isActive, students тощо
  // відкинуто, дати приведено до Date | null
  async createGroup(groupData: ICreateGroupDto) {
    const { teachers, ...rest } = groupData;

    const existingGroup = await groupRepository.findByName(rest.name);
    if (existingGroup) {
      throw new BadRequestError('Група з такою назвою вже існує');
    }
    await assertActiveTeachers(teachers);

    const academyId = await academyRepository.getDefaultId();
    return groupRepository.create({ ...rest, academyId }, teachers);
  },

  async updateGroup(id: string, groupData: IUpdateGroupDto) {
    const { teachers, ...rest } = groupData;

    if (teachers) await assertActiveTeachers(teachers);

    let updated;
    try {
      updated = await groupRepository.update(id, rest, teachers);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw new NotFoundError('Групу не знайдено');
      if (isPrismaError(error, 'P2002'))
        throw new BadRequestError('Група з такою назвою вже існує');
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
