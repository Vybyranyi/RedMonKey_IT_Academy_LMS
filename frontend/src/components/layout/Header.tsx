import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { UserRole, type IUser } from '@redmonkey/shared';
import { useAuthStore } from '@/store/authStore';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { navigationItems } from './navigation';

interface PageMeta {
  title: string;
  subtitle: string;
  /** Назва для вкладки браузера, якщо заголовок сторінки для неї не підходить */
  tabTitle?: string;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const NOT_FOUND_META: PageMeta = { title: 'Сторінку не знайдено', subtitle: '' };
const FORBIDDEN_META: PageMeta = { title: 'Доступ заборонено', subtitle: '' };

/**
 * Шлях порівнюємо точно, а не через startsWith: вкладених маршрутів немає, тож
 * /students/abc — це вже 404, і заголовок «Студенти» над ним вводив би в оману.
 */
const getPageMeta = (rawPath: string, user: IUser | null): PageMeta => {
  // React Router пускає /students/ на маршрут /students — заголовок має збігатися
  const path = rawPath.replace(/\/+$/, '') || '/';

  // Ролі розділів — ті самі, що бачить Sidebar. Якщо розділ ролі недоступний,
  // ProtectedRoute показує стан 403, і заголовок розділу над ним був би зайвим
  const navItem = navigationItems.find((item) => item.path === path);
  if (navItem && user && !navItem.roles.includes(user.role)) return FORBIDDEN_META;

  switch (path) {
    case '/':
      return {
        title: `Вітаємо, ${user?.firstName ?? ''}!`,
        tabTitle: 'Головна',
        subtitle: capitalize(format(new Date(), 'eeee, d MMMM yyyy', { locale: uk })),
      };
    case '/students':
      return {
        title: 'Студенти',
        subtitle: 'Управління обліковими записами студентів та моніторинг успішності',
      };
    case '/teachers':
      return {
        title: 'Викладачі',
        subtitle: 'Викладацький склад IT Академії та напрямки їх роботи',
      };
    case '/groups':
      return {
        title: 'Групи',
        subtitle: 'Управління академічними групами та перегляд їхнього складу',
      };
    case '/schedule':
      return { title: 'Розклад занять', subtitle: 'Календар навчальних подій' };
    case '/grades':
      // Студент бачить у журналі лише власні оцінки, тож загальний підзаголовок
      // про успішність студентів для нього неточний
      return {
        title: 'Журнал оцінок',
        subtitle:
          user?.role === UserRole.STUDENT
            ? 'Ваші оцінки за заняттями'
            : 'Успішність студентів за навчальними групами',
      };
    case '/coins':
      return { title: 'RedCoins', subtitle: 'Внутрішня гейміфікована валюта академії' };
    case '/profile':
      return { title: 'Мій профіль', subtitle: 'Перегляд та редагування власних даних' };
    case '/settings':
      return { title: 'Налаштування', subtitle: 'Системні налаштування платформи' };
    default:
      return NOT_FOUND_META;
  }
};

export default function Header() {
  const location = useLocation();
  const { user } = useAuthStore();

  const { title, subtitle, tabTitle } = getPageMeta(location.pathname, user);
  useDocumentTitle(tabTitle ?? title);

  return (
    <header className="px-4 pt-6 pb-5 md:px-8 md:pt-10 md:pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-[28px] leading-tight font-extrabold text-[#1A2645] tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="text-[14px] font-medium text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div id="header-actions" className="flex items-center gap-3">
        {/* Placeholder for page-specific actions (e.g. Buttons) that can be injected via React Portal by individual pages */}
      </div>
    </header>
  );
}
