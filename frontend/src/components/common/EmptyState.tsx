import type { ComponentType, ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  /** CTA: «Додати студента», «Скинути фільтри» тощо */
  children?: ReactNode;
  className?: string;
}

/** Порожній список: пояснює, чому тут нічого немає, і що з цим зробити. */
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center',
        className
      )}
    >
      <div className="p-3 bg-slate-50 text-slate-400 rounded-xl">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm font-medium text-slate-400">{description}</p>
      )}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
