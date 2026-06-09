import type { ComponentType } from 'react';
import { UserRole } from '@redmonkey/shared';
import { 
  LayoutDashboard, Users, GraduationCap, CalendarDays, 
  BookOpenCheck, CircleDollarSign, Settings 
} from 'lucide-react';

export interface NavItem {
  name: string;
  path: string;
  icon: ComponentType<any>;
  roles: UserRole[];
}

export const navigationItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT] },
  { name: 'Студенти', path: '/students', icon: Users, roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { name: 'Викладачі', path: '/teachers', icon: GraduationCap, roles: [UserRole.ADMIN] },
  { name: 'Групи', path: '/groups', icon: BookOpenCheck, roles: [UserRole.ADMIN] },
  { name: 'Розклад', path: '/schedule', icon: CalendarDays, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT] },
  { name: 'Журнал оцінок', path: '/grades', icon: BookOpenCheck, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT] },
  { name: 'RedCoins', path: '/coins', icon: CircleDollarSign, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT] },
  { name: 'Налаштування', path: '/settings', icon: Settings, roles: [UserRole.ADMIN] },
];
