import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@redmonkey/shared';
import { 
  LayoutDashboard, Users, GraduationCap, CalendarDays, 
  BookOpenCheck, CircleDollarSign, Settings 
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  roles: UserRole[];
}

const navigationItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT] },
  { name: 'Студенти', path: '/students', icon: Users, roles: [UserRole.ADMIN, UserRole.TEACHER] },
  { name: 'Викладачі', path: '/teachers', icon: GraduationCap, roles: [UserRole.ADMIN] },
  { name: 'Групи', path: '/groups', icon: BookOpenCheck, roles: [UserRole.ADMIN] },
  { name: 'Розклад', path: '/schedule', icon: CalendarDays, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT] },
  { name: 'Журнал оцінок', path: '/grades', icon: BookOpenCheck, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT] },
  { name: 'RedCoins', path: '/coins', icon: CircleDollarSign, roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT] },
  { name: 'Налаштування', path: '/settings', icon: Settings, roles: [UserRole.ADMIN] },
];

export default function Sidebar() {
  const { user } = useAuthStore();

  if (!user) return null;

  const filteredItems = navigationItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen p-4 flex flex-col border-r border-slate-800">
      <div className="py-4 px-2 mb-6">
        <span className="text-xl font-bold tracking-wider text-primary">REDMONKEY LMS</span>
      </div>
      <nav className="flex-1 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}