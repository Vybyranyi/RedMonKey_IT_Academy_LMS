import type { ComponentType, ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  /** CTA: «Додати студента», «Скинути фільтри» тощо */
  children?: ReactNode;
  /** compact — усередині картки чи модалки, де повнорозмірний стан задавить сусідів */
  size?: 'default' | 'compact';
  className?: string;
}

/** Порожній список: пояснює, чому тут нічого немає, і що з цим зробити. */
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  children,
  size = 'default',
  className,
}: EmptyStateProps) {
  const isCompact = size === 'compact';

  return (
    <div
      className={cn(
        'bg-white border border-dashed border-slate-200 rounded-xl text-center flex flex-col items-center',
        isCompact ? 'p-5' : 'p-8',
        className
      )}
    >
      <div className={cn('bg-slate-50 text-slate-400 rounded-xl', isCompact ? 'p-2' : 'p-3')}>
        <Icon className={isCompact ? 'h-5 w-5' : 'h-6 w-6'} />
      </div>
      <p
        className={cn(
          'font-semibold text-slate-700',
          isCompact ? 'mt-3 text-sm' : 'mt-4 text-base'
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            'mt-1 max-w-md font-medium text-slate-500',
            isCompact ? 'text-xs' : 'text-sm'
          )}
        >
          {description}
        </p>
      )}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
