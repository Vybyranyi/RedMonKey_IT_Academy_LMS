import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useAuthStore } from '@/store/authStore';

export default function Header() {
  const location = useLocation();
  const { user } = useAuthStore();
  
  const getPageTitle = (path: string) => {
    if (path === '/') {
      return user?.role === 'admin' ? 'Панель адміністратора' : 
             user?.role === 'teacher' ? 'Панель викладача' : 'Особистий кабінет';
    }
    if (path.startsWith('/students')) return 'Студенти';
    if (path.startsWith('/teachers')) return 'Викладачі';
    if (path.startsWith('/groups')) return 'Групи';
    if (path.startsWith('/schedule')) return 'Розклад';
    if (path.startsWith('/grades')) return 'Журнал оцінок';
    if (path.startsWith('/coins')) return 'RedCoins';
    if (path.startsWith('/settings')) return 'Налаштування';
    return 'Панель керування';
  };

  const title = getPageTitle(location.pathname);
  const today = format(new Date(), "eeee, d MMMM", { locale: uk });
  const dateText = `Сьогодні, ${today}`;

  return (
    <header className="px-8 pt-10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold text-[#1A2645] tracking-tight">{title}</h1>
        <p className="text-[14px] font-medium text-slate-500 mt-1">
          {dateText}
        </p>
      </div>
      <div id="header-actions" className="flex items-center gap-3">
        {/* Placeholder for page-specific actions (e.g. Buttons) that can be injected via React Portal by individual pages */}
      </div>
    </header>
  );
}