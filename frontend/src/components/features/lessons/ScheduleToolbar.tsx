import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type ScheduleView = 'week' | 'month';

interface ScheduleToolbarProps {
  label: string;
  view: ScheduleView;
  onView: (view: ScheduleView) => void;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
}

const VIEW_OPTIONS: { value: ScheduleView; label: string }[] = [
  { value: 'week', label: 'Тиждень' },
  { value: 'month', label: 'Місяць' },
];

export default function ScheduleToolbar({ label, view, onView, onNavigate }: ScheduleToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-slate-200 rounded-md"
          onClick={() => onNavigate('PREV')}
          aria-label="Попередній період"
        >
          <ChevronLeft className="h-4 w-4 text-slate-600" />
        </Button>

        <span className="text-lg font-bold text-[#1A2645] text-center min-w-[210px]">{label}</span>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-slate-200 rounded-md"
          onClick={() => onNavigate('NEXT')}
          aria-label="Наступний період"
        >
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </Button>

        <Button
          variant="outline"
          className="h-9 border-slate-200 rounded-md text-slate-600 font-medium ml-1"
          onClick={() => onNavigate('TODAY')}
        >
          Сьогодні
        </Button>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onView(option.value)}
            className={`px-4 h-8 rounded-md text-sm font-semibold transition-colors ${
              view === option.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
