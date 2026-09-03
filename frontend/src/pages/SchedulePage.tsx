import { useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import {
  format,
  parse,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getDay,
  addMinutes,
  addWeeks,
  addMonths,
} from 'date-fns';
import { uk } from 'date-fns/locale';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { UserRole } from '@redmonkey/shared';
import type { ILessonDto, IPopulatedLesson } from '@redmonkey/shared';
import { apiCreateLesson, apiGetLessons } from '@/api/lessons';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/utils/apiError';
import { LESSON_TYPE_META } from '@/lib/lessonTypes';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import LessonEvent from '@/components/features/lessons/LessonEvent';
import LessonForm from '@/components/features/lessons/LessonForm';
import LessonTypeLegend from '@/components/features/lessons/LessonTypeLegend';
import ScheduleToolbar from '@/components/features/lessons/ScheduleToolbar';
import type { ScheduleView } from '@/components/features/lessons/ScheduleToolbar';
// Стилі бібліотеки підключені всередині calendar.css — там вони заводяться
// у Tailwind-шар, інакше їх не перебити утилітами (див. коментар у файлі).
import '@/styles/calendar.css';

interface ScheduleEvent {
  title: string;
  start: Date;
  end: Date;
  resource: IPopulatedLesson;
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { uk },
});

const CALENDAR_VIEWS: View[] = ['week', 'month'];

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function SchedulePage() {
  const { user } = useAuthStore();
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHER;

  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<ScheduleView>('week');
  const [lessons, setLessons] = useState<IPopulatedLesson[]>([]);
  const [loadedRangeKey, setLoadedRangeKey] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<IPopulatedLesson | null>(null);

  // Лічильник перезавантаження: після створення заняття збільшуємо його,
  // і ефект перечитує список тим самим запитом.
  const [reloadKey, setReloadKey] = useState(0);

  const range = useMemo(() => {
    return view === 'week'
      ? { from: startOfWeek(date, { weekStartsOn: 1 }), to: endOfWeek(date, { weekStartsOn: 1 }) }
      : { from: startOfMonth(date), to: endOfMonth(date) };
  }, [date, view]);

  const rangeKey = `${range.from.toISOString()}|${range.to.toISOString()}`;

  // Скелетон показуємо, поки завантажений діапазон не збігся з видимим. Так
  // стан завантаження не вимагає setState прямо в тілі ефекту (react-hooks).
  const isLoading = loadedRangeKey !== rangeKey;

  useEffect(() => {
    let cancelled = false;

    const loadLessons = async () => {
      try {
        const data = await apiGetLessons({
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        });
        if (!cancelled) setLessons(data);
      } catch (error) {
        if (!cancelled) toast.error(getApiErrorMessage(error, 'Не вдалося завантажити розклад'));
      } finally {
        if (!cancelled) setLoadedRangeKey(rangeKey);
      }
    };

    loadLessons();

    return () => {
      cancelled = true;
    };
  }, [range, rangeKey, reloadKey]);

  const events = useMemo<ScheduleEvent[]>(
    () =>
      lessons.map((lesson) => {
        const start = new Date(lesson.date);
        return {
          title: lesson.title,
          start,
          end: addMinutes(start, lesson.duration),
          resource: lesson,
        };
      }),
    [lessons]
  );

  const rangeLabel =
    view === 'week'
      ? `${format(range.from, 'd')} — ${capitalize(format(range.to, 'd MMMM yyyy', { locale: uk }))}`
      : capitalize(format(date, 'LLLL yyyy', { locale: uk }));

  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    if (action === 'TODAY') {
      setDate(new Date());
      return;
    }

    const step = action === 'NEXT' ? 1 : -1;
    setDate((current) => (view === 'week' ? addWeeks(current, step) : addMonths(current, step)));
  };

  const handleCreateLesson = async (values: ILessonDto | Partial<ILessonDto>) => {
    setIsSubmitting(true);
    try {
      // Без initialValues форма віддає повний payload — це створення
      await apiCreateLesson(values as ILessonDto);
      setIsCreateOpen(false);
      toast.success('Заняття створено');
      setReloadKey((key) => key + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося створити заняття'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Розклад занять</h1>
          <p className="text-slate-500">Календар навчальних подій</p>
        </div>
        {canManage && (
          <Button
            className="flex items-center gap-2 bg-[#C10000] hover:bg-[#A00000] text-white"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Додати заняття
          </Button>
        )}
      </div>

      <ScheduleToolbar label={rangeLabel} view={view} onView={setView} onNavigate={handleNavigate} />

      <LessonTypeLegend />

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {isLoading ? (
          <Skeleton className="h-[700px] w-full rounded-lg" />
        ) : (
          <Calendar<ScheduleEvent>
            localizer={localizer}
            events={events}
            date={date}
            view={view}
            onNavigate={setDate}
            onView={(next) => setView(next as ScheduleView)}
            views={CALENDAR_VIEWS}
            toolbar={false}
            culture="uk"
            step={30}
            min={new Date(1970, 0, 1, 8, 0)}
            max={new Date(1970, 0, 1, 21, 0)}
            style={{ height: 700 }}
            eventPropGetter={(event) => ({
              // Поки немає модалки деталей (#39), вибране заняття лише підсвічуємо
              className: `${LESSON_TYPE_META[event.resource.type].event}${
                selectedLesson?.id === event.resource.id ? ' ring-2 ring-[#BA0000]' : ''
              }`,
            })}
            components={{ event: LessonEvent }}
            onSelectEvent={(event) => setSelectedLesson(event.resource)}
            messages={{
              next: 'Далі',
              previous: 'Назад',
              today: 'Сьогодні',
              month: 'Місяць',
              week: 'Тиждень',
              noEventsInRange: 'Занять у цьому періоді немає',
            }}
          />
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нове заняття</DialogTitle>
          </DialogHeader>
          <LessonForm onSubmit={handleCreateLesson} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
