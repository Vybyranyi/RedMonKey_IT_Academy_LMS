import { UserRole } from '../enums';

export interface IUserBase {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  phone?: string | null;
  redCoins: number;
  isActive: boolean;
}

export interface IUser extends IUserBase {
  id: string;
  academyId?: string;
  group?: string | { id: string; name: string } | null; // ID групи або populated { id, name }
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Агрегати для рядка таблиці студентів (GET /users?withStats=true) — рахуються так само,
 * як у GET /users/:id/stats. null — оцінок чи відміток явки ще немає, а не «нуль».
 */
export interface IStudentListStats {
  averageGrade: number | null;
  attendanceRate: number | null;
}

/**
 * stats: null — це не студент або його статистику актору не видно
 * (викладач бачить її лише для студентів своїх груп, як і GET /users/:id/stats).
 */
export interface IUserWithListStats extends IUser {
  stats: IStudentListStats | null;
}

export interface IUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string | null;
  group?: string | null;
}
