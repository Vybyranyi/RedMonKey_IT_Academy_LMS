import type { IUser } from '@redmonkey/shared';

/**
 * Поля статистики, яких бекенд ще не віддає — на них чекає `GET /users/:id/stats`
 * (ТЗ 4.2). Доки ендпоінта немає, UI читає їх як опційні: краще так, ніж `as any`
 * у кожному компоненті. Коли ендпоінт з'явиться — тип переїде в shared.
 */
export interface IUserWithStats extends IUser {
  averageScore?: number;
  attendance?: number;
  studentsCount?: number;
  subjects?: string[];
  groups?: string[];
  grades?: { score: number; topic: string }[];
  transactions?: { amount: number; reason: string; author: string; date: string }[];
}
