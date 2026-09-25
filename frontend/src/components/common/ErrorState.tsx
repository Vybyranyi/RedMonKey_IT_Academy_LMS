import type { ComponentType, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  icon?: ComponentType<{ className?: string }>;
  /** Великий код над заголовком — 404, 403 */
  code?: string;
  title: string;
  description?: string;
  /** Показує кнопку «Спробувати знову» — для помилок завантаження, які можна повторити */
  onRetry?: () => void;
  /** Додаткові дії: посилання на головну тощо */
  children?: ReactNode;
  className?: string;
}

/** Стан помилки: 404/403, збій завантаження, впала сторінка. Порожній список — це EmptyState. */
export default function ErrorState({
  icon: Icon = AlertTriangle,
  code,
  title,
  description,
  onRetry,
  children,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'bg-white border border-slate-200 rounded-xl p-8 md:p-12 text-center flex flex-col items-center',
        className
      )}
    >
      <div className="p-3 bg-red-50 text-primary rounded-xl">
        <Icon className="h-6 w-6" />
      </div>
      {code && <p className="mt-4 text-sm font-bold tracking-[0.2em] text-[#C10000]">{code}</p>}
      <h3 className={cn('text-xl font-bold text-[#1A2645]', code ? 'mt-1' : 'mt-4')}>{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm font-medium text-slate-500">{description}</p>
      )}

      {(onRetry || children) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button
              className="h-10 px-4 bg-[#C10000] hover:bg-[#A00000] text-white"
              onClick={onRetry}
            >
              <RotateCw className="h-4 w-4" /> Спробувати знову
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
