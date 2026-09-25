import type { IUser } from '@redmonkey/shared';

/**
 * Поля, яких бекенд не віддає: картки викладача (studentsCount, subjects, groups) і списки
 * оцінок та транзакцій у StudentDetailsModal. UI читає їх як опційні — краще так, ніж
 * `as any` у кожному компоненті. Середній бал і відвідуваність студента вже справжні —
 * IUserWithListStats із shared (GET /users?withStats=true).
 */
export interface IUserWithStats extends IUser {
  studentsCount?: number;
  subjects?: string[];
  groups?: string[];
  grades?: { score: number; topic: string }[];
  transactions?: { amount: number; reason: string; author: string; date: string }[];
}
