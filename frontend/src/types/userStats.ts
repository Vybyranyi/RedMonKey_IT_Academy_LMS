import type { IUser } from '@redmonkey/shared';

/**
 * Поля картки викладача, яких бекенд не віддає. UI читає їх як опційні — краще так,
 * ніж `as any` у кожному компоненті. Дані студента вже справжні: бал і відвідуваність —
 * IUserWithListStats із shared (GET /users?withStats=true), оцінки й транзакції
 * StudentDetailsModal завантажує сама.
 */
export interface IUserWithStats extends IUser {
  studentsCount?: number;
  subjects?: string[];
  groups?: string[];
}
