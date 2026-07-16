import { UserRole } from '@redmonkey/shared';
import { groupRepository } from '../repositories/group.repository.js';
import { TokenPayload } from '../utils/jwt.js';

/** Мінімум даних про ціль, якого достатньо для рішення про доступ. */
export interface UserSubject {
  id: string;
  role: UserRole;
  groupId: string | null;
}

export interface GroupSubject {
  teacherIds: string[];
  studentIds: string[];
}

/**
 * Єдине місце, де живуть правила видимості записів.
 * Після переходу на Postgres ці ж правила транслюються в RLS-політики майже 1:1.
 */
export const accessPolicy = {
  async canViewUser(actor: TokenPayload, target: UserSubject): Promise<boolean> {
    if (actor.role === UserRole.ADMIN) return true;
    if (actor.userId === target.id) return true;

    if (actor.role === UserRole.TEACHER) {
      if (target.role !== UserRole.STUDENT || !target.groupId) return false;
      const ownGroupIds = await groupRepository.findIdsByTeacher(actor.userId);
      return ownGroupIds.includes(target.groupId);
    }

    return false;
  },

  async canViewGroup(actor: TokenPayload, target: GroupSubject): Promise<boolean> {
    if (actor.role === UserRole.ADMIN) return true;
    if (actor.role === UserRole.TEACHER) return target.teacherIds.includes(actor.userId);
    if (actor.role === UserRole.STUDENT) return target.studentIds.includes(actor.userId);
    return false;
  },
};
