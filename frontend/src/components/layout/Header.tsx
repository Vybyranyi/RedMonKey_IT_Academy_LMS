import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useAuthStore } from '@/store/authStore';

interface PageMeta {
  title: string;
  subtitle: string;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function Header() {
  const location = useLocation();
  const { user } = useAuthStore();

  const getPageMeta = (path: string): PageMeta => {
    if (path === '/') {
      return {
        title: `Вітаємо, ${user?.firstName ?? ''}!`,
        subtitle: capitalize(format(new Date(), 'eeee, d MMMM yyyy', { locale: uk })),
      };
    }
    if (path.startsWith('/students')) {
      return { title: 'Студенти', subtitle: 'Управління обліковими записами студентів та моніторинг успішності' };
    }
    if (path.startsWith('/teachers')) {
      return { title: 'Викладачі', subtitle: 'Викладацький склад IT Академії та напрямки їх роботи' };
    }
    if (path.startsWith('/groups')) {
      return { title: 'Групи', subtitle: 'Управління академічними групами та перегляд їхнього складу' };
    }
    if (path.startsWith('/schedule')) {
      return { title: 'Розклад занять', subtitle: 'Календар навчальних подій' };
    }
    if (path.startsWith('/grades')) {
      return { title: 'Журнал оцінок', subtitle: 'Успішність студентів за навчальними групами' };
    }
    if (path.startsWith('/coins')) {
      return { title: 'RedCoins', subtitle: 'Внутрішня гейміфікована валюта академії' };
    }
    if (path.startsWith('/profile')) {
      return { title: 'Мій профіль', subtitle: 'Перегляд та редагування власних даних' };
    }
    if (path.startsWith('/settings')) {
      return { title: 'Налаштування', subtitle: 'Системні налаштування платформи' };
    }
    return { title: 'Панель керування', subtitle: '' };
  };

  const { title, subtitle } = getPageMeta(location.pathname);

  return (
    <header className="px-8 pt-10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold text-[#1A2645] tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-[14px] font-medium text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      <div id="header-actions" className="flex items-center gap-3">
        {/* Placeholder for page-specific actions (e.g. Buttons) that can be injected via React Portal by individual pages */}
      </div>
    </header>
  );
}