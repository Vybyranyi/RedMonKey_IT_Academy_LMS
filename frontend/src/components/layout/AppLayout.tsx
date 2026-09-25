import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ErrorState from '@/components/common/ErrorState';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

export default function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex bg-[#F8F9FA] min-h-dvh font-sans">
      <Sidebar />
      {/* min-w-0: інакше широка таблиця розтягує flex-колонку і з'являється горизонтальний скрол усієї сторінки */}
      <div className="flex-1 min-w-0 flex flex-col h-dvh overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto">
            <Header />
            {/* pb-28 на мобайлі — місце під Bottom Nav, щоб вона не перекривала кінець сторінки */}
            <main className="px-4 pb-28 md:px-8 md:pb-10">
              {/* Впала одна сторінка — Sidebar і навігація лишаються робочими.
                  key скидає помилку при переході на інший маршрут */}
              <ErrorBoundary
                key={pathname}
                fallback={(reset) => (
                  <ErrorState
                    title="Сторінка не відкрилась"
                    description="Під час відображення сталася неочікувана помилка. Спробуйте ще раз або перейдіть до іншого розділу."
                    onRetry={reset}
                  >
                    <Button variant="outline" className="h-10 px-4" asChild>
                      <Link to="/">На головну</Link>
                    </Button>
                  </ErrorState>
                )}
              >
                <Outlet />
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
