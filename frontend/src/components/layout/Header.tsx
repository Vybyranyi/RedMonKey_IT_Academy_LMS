import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { UserRole } from '@redmonkey/shared';
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
      // Студент бачить у журналі лише власні оцінки, тож загальний підзаголовок
      // про успішність студентів для нього неточний
      return {
        title: 'Журнал оцінок',
        subtitle:
          user?.role === UserRole.STUDENT
            ? 'Ваші оцінки за заняттями'
            : 'Успішність студентів за навчальними групами',
      };
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