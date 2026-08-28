import { UserRole } from "@redmonkey/shared";
import { groupRepository } from "../repositories/group.repository.js";
import { TokenPayload } from "../utils/jwt.js";
import { userRepository } from "../repositories/user.repository.js";

export interface UserSubject {
  id: string;
  role: UserRole;
  groupId: string | null;
}

export interface GroupSubject {
  teacherIds: string[];
  studentIds: string[];
}

export interface LessonSubject {
  teacherId: string;
  groupId: string;
}

export const accessPolicy = {
  async canViewUser(
    actor: TokenPayload,
    target: UserSubject,
  ): Promise<boolean> {
    if (actor.role === UserRole.ADMIN) return true;
    if (actor.userId === target.id) return true;

    if (actor.role === UserRole.TEACHER) {
      if (target.role !== UserRole.STUDENT || !target.groupId) return false;
      const ownGroupIds = await groupRepository.findIdsByTeacher(actor.userId);
      return ownGroupIds.includes(target.groupId);
    }

    return false;
  },

  async canViewGroup(
    actor: TokenPayload,
    target: GroupSubject,
  ): Promise<boolean> {
    if (actor.role === UserRole.ADMIN) return true;
    if (actor.role === UserRole.TEACHER)
      return target.teacherIds.includes(actor.userId);
    if (actor.role === UserRole.STUDENT)
      return target.studentIds.includes(actor.userId);
    return false;
  },

  async canViewLesson(
    actor: TokenPayload,
    target: LessonSubject,
  ): Promise<boolean> {
    if (actor.role === UserRole.ADMIN) return true;

    if (actor.role === UserRole.TEACHER) {
      if (target.teacherId === actor.userId) return true;
      const ownGroupIds = await groupRepository.findIdsByTeacher(actor.userId);
      return ownGroupIds.includes(target.groupId);
    }

    if (actor.role === UserRole.STUDENT) {
      const student = await userRepository.findById(actor.userId);
      return student?.groupId === target.groupId;
    }

    return false;
  },

  /** Редагувати/скасовувати заняття може адмін або викладач-власник (ТЗ 4.4). */
  canManageLesson(actor: TokenPayload, target: LessonSubject): boolean {
    if (actor.role === UserRole.ADMIN) return true;
    return actor.role === UserRole.TEACHER && target.teacherId === actor.userId;
  },
};
