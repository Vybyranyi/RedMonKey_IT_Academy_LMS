import { useEffect, useState } from 'react';
import { LogOut, RotateCw, WifiOff } from 'lucide-react';
import AppRouter from './router';
import { useAuthStore } from './store/authStore';
import { apiGetMe, logout } from './api/auth';
import { getApiErrorMessage, isSilentError } from './utils/apiError';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import AppSkeleton from '@/components/layout/AppSkeleton';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ErrorState from '@/components/common/ErrorState';

function App() {
  const { isAuthenticated, user, setUser } = useAuthStore();
  const [initError, setInitError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Токен є в localStorage, а профілю ще немає — відновлюємо сесію після перезавантаження
  const isRestoringSession = isAuthenticated && !user;

  useEffect(() => {
    if (!isRestoringSession) return;
    const controller = new AbortController();

    apiGetMe({ signal: controller.signal })
      .then(setUser)
      .catch((error) => {
        // Протухлу сесію вже закрив interceptor (стор очищено, toast показано).
        // Решта — сервер недоступний: розлогінювати через це не можна
        if (!isSilentError(error)) {
          setInitError(getApiErrorMessage(error, 'Не вдалося завантажити профіль'));
        }
      });

    return () => controller.abort();
  }, [isRestoringSession, setUser, attempt]);

  const retry = () => {
    setInitError(null);
    setAttempt((value) => value + 1);
  };

  let content = <AppRouter />;
  if (isRestoringSession) {
    content = initError ? (
      <div className="min-h-dvh flex items-center justify-center bg-[#F8F9FA] p-4">
        <ErrorState
          icon={WifiOff}
          title="Не вдалося відкрити LMS"
          description={initError}
          onRetry={retry}
          className="w-full max-w-lg"
        >
          <Button variant="outline" className="h-10 px-4" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" /> Вийти
          </Button>
        </ErrorState>
      </div>
    ) : (
      <AppSkeleton />
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      {/* Остання лінія оборони: сюди долітає лише те, що зламало сам AppLayout або
          сторінку входу. Помилку окремої сторінки ловить внутрішній boundary в AppLayout */}
      <ErrorBoundary
        fallback={() => (
          <div className="min-h-dvh flex items-center justify-center bg-[#F8F9FA] p-4">
            <ErrorState
              title="Щось пішло не так"
              description="Інтерфейс зіткнувся з неочікуваною помилкою. Оновіть сторінку — дані на сервері не постраждали."
              className="w-full max-w-lg"
            >
              <Button
                className="h-10 px-4 bg-[#C10000] hover:bg-[#A00000] text-white"
                onClick={() => window.location.reload()}
              >
                <RotateCw className="h-4 w-4" /> Оновити сторінку
              </Button>
              <Button variant="outline" className="h-10 px-4" asChild>
                <a href="/">На головну</a>
              </Button>
            </ErrorState>
          </div>
        )}
      >
        {content}
      </ErrorBoundary>
    </>
  );
}

export default App;
