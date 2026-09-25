import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { UserRole } from '@redmonkey/shared';
import { logout } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { navigationItems } from './navigation';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Адміністратор',
  [UserRole.TEACHER]: 'Викладач',
  [UserRole.STUDENT]: 'Студент',
};

const tabClass = (isActive: boolean) =>
  `flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors ${
    isActive ? 'text-white' : 'text-slate-300 hover:text-white'
  }`;

const iconClass = (isActive: boolean) =>
  `flex items-center justify-center rounded-[12px] px-4 py-1 transition-colors ${
    isActive ? 'bg-[#C10000] shadow-md' : ''
  }`;

/**
 * Мобільна навігація (< md) замість Sidebar: чотири головні розділи з ТЗ 6.3
 * внизу екрана під великий палець, решта — разом із профілем і виходом у меню «Ще».
 */
export default function BottomNav() {
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) return null;

  const allowed = navigationItems.filter((item) => item.roles.includes(user.role));
  const tabs = allowed.filter((item) => item.inBottomNav);
  const menuItems = allowed.filter((item) => !item.inBottomNav);
  // Відкритий розділ з меню «Ще» підсвічує саму кнопку — інакше не видно, де ти
  const isMenuSectionActive =
    pathname === '/profile' || menuItems.some((item) => pathname.startsWith(item.path));

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <nav
        aria-label="Основна навігація"
        className="focus-on-dark md:hidden fixed inset-x-0 bottom-0 z-40 bg-[#29425D] border-t border-white/10 shadow-[0_-4px_12px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => tabClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <span className={iconClass(isActive)}>
                      <Icon className="h-4.5 w-4.5" strokeWidth={2.5} />
                    </span>
                    {item.shortName ?? item.name}
                  </>
                )}
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isMenuOpen}
            className={tabClass(isMenuSectionActive)}
          >
            <span className={iconClass(isMenuSectionActive)}>
              <Menu className="h-4.5 w-4.5" strokeWidth={2.5} />
            </span>
            Ще
          </button>
        </div>
      </nav>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent
          side="bottom"
          className="focus-on-dark md:hidden rounded-t-[20px] bg-[#29425D] text-slate-100 border-0 p-0 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="px-5 pt-5 pb-2">
            <SheetTitle className="text-white text-lg font-bold">Меню</SheetTitle>
            <SheetDescription className="sr-only">Інші розділи, профіль і вихід</SheetDescription>
          </SheetHeader>

          <div className="px-3 space-y-1.5">
            <NavLink
              to="/profile"
              onClick={closeMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[16px] p-3 transition-colors ${
                  isActive ? 'bg-[#C10000]' : 'bg-[#1A3150] hover:bg-[#152744]'
                }`
              }
            >
              <Avatar className="h-10 w-10 bg-[#0070F3]">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="bg-[#0070F3] text-white font-bold text-xs">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs font-medium text-[#8B9DB4]">{ROLE_LABELS[user.role]}</p>
              </div>
            </NavLink>

            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 rounded-[12px] px-4 py-3 text-[14px] font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#C10000] text-white'
                        : 'text-slate-300 hover:bg-[#1A3150] hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4.5 w-4.5" strokeWidth={2.5} />
                  {item.name}
                </NavLink>
              );
            })}

            <button
              type="button"
              onClick={() => {
                closeMenu();
                void logout();
              }}
              className="flex w-full items-center gap-3.5 rounded-[12px] px-4 py-3 text-[14px] font-semibold text-slate-300 hover:bg-[#1A3150] hover:text-white transition-colors"
            >
              <LogOut className="h-4.5 w-4.5" strokeWidth={2.5} />
              Вийти
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
