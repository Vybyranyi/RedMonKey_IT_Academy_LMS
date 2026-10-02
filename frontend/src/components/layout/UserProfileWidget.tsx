import { logout } from '@/api/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@redmonkey/shared';
import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Адміністратор',
  [UserRole.TEACHER]: 'Викладач',
  [UserRole.STUDENT]: 'Студент',
};

interface UserProfileWidgetProps {
  isCollapsed: boolean;
}

/**
 * Профіль — справжнє посилання (Tab + Enter, активний стан як у меню), а «Вийти» —
 * окрема кнопка поруч, завжди видима: кнопка всередині посилання недійсна в HTML,
 * а показ лише на hover ховав її на планшетах без миші.
 */
export default function UserProfileWidget({ isCollapsed }: UserProfileWidgetProps) {
  const { user } = useAuthStore();

  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className={`flex gap-2 ${isCollapsed ? 'flex-col items-center' : 'items-center'}`}>
      <NavLink
        to="/profile"
        title={isCollapsed ? `Мій профіль: ${fullName}` : undefined}
        aria-label={isCollapsed ? `Мій профіль: ${fullName}` : undefined}
        className={({ isActive }) =>
          `flex min-w-0 flex-1 items-center rounded-[16px] border transition-colors ${
            isActive
              ? 'bg-[#C10000] border-transparent'
              : 'bg-[#1A3150] border-transparent hover:bg-[#152744] hover:border-slate-700/50'
          } ${isCollapsed ? 'justify-center p-2' : 'gap-3 p-3'}`
        }
      >
        <Avatar
          className={`ring-2 ring-[#29425D] bg-[#0070F3] ${isCollapsed ? 'h-10 w-10' : 'h-9 w-9'}`}
        >
          <AvatarImage src={user.avatar || undefined} />
          <AvatarFallback className="bg-[#0070F3] text-white font-bold text-xs">
            {user.firstName[0]}
            {user.lastName[0]}
          </AvatarFallback>
        </Avatar>

        {!isCollapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white truncate leading-tight mb-0.5">
              {fullName}
            </p>
            <p className="text-[11px] font-medium text-slate-300 truncate">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        )}
      </NavLink>

      <button
        type="button"
        onClick={() => void logout()}
        title="Вийти"
        aria-label="Вийти"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-slate-300 hover:bg-[#1A3150] hover:text-white transition-colors"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
