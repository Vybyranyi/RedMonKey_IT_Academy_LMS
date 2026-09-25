import { UserRole } from '@redmonkey/shared';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  BookOpenCheck,
  CircleDollarSign,
  Settings,
} from 'lucide-react';

export interface NavItem {
  name: string;
  /** Коротка назва для Bottom Nav — на мобайлі під іконкою вміщається одне слово */
  shortName?: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
  /** Пункт Bottom Nav; решта — у меню «Ще» (ТЗ, розділ 6.3) */
  inBottomNav?: boolean;
}

export const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    shortName: 'Головна',
    path: '/',
    icon: LayoutDashboard,
    roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT],
    inBottomNav: true,
  },
  { name: 'Студенти', path: '/students', icon: Users, roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { name: 'Викладачі', path: '/teachers', icon: GraduationCap, roles: [UserRole.ADMIN] },
  { name: 'Групи', path: '/groups', icon: BookOpenCheck, roles: [UserRole.ADMIN] },
  {
    name: 'Розклад',
    path: '/schedule',
    icon: CalendarDays,
    roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT],
    inBottomNav: true,
  },
  {
    name: 'Журнал оцінок',
    shortName: 'Оцінки',
    path: '/grades',
    icon: BookOpenCheck,
    roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT],
    inBottomNav: true,
  },
  {
    name: 'RedCoins',
    shortName: 'Монети',
    path: '/coins',
    icon: CircleDollarSign,
    roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT],
    inBottomNav: true,
  },
  { name: 'Налаштування', path: '/settings', icon: Settings, roles: [UserRole.ADMIN] },
];
