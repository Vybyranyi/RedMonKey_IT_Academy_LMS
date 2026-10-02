import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  isToday,
  isValid,
} from 'date-fns';
import { uk } from 'date-fns/locale';
import { toast } from 'sonner';
import { CalendarDays, Plus } from 'lucide-react';
import { LessonStatus, UserRole } from '@redmonkey/shared';
import type { ILessonDto, IPopulatedLesson } from '@redmonkey/shared';
import { apiCreateLesson, apiGetLessonById, apiGetLessons, apiUpdateLesson } from '@/api/lessons';
import { useAuthStore } from '@/store/authStore';
import { calendarHours } from '@/lib/calendarHours';
import { getApiErrorMessage, isSilentError, toastApiError } from '@/utils/apiError';
import { LESSON_TYPE_META } from '@/lib/lessonTypes';
import { replaceById } from '@/lib/optimistic';
import { PHONE_QUERY, useMediaQuery } from '@/lib/useMediaQuery';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import LessonDetailsModal from '@/components/features/lessons/LessonDetailsModal';
import LessonEvent from '@/components/features/lessons/LessonEvent';
import LessonForm, { type LessonFormValues } from '@/components/features/lessons/LessonForm';
import LessonTypeLegend from '@/components/features/lessons/LessonTypeLegend';
import ScheduleAgenda from '@/components/features/lessons/ScheduleAgenda';
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

/** ?date=2026-09-22 — місцевий день; без параметра чи з битим — сьогодні. */
const parseDateParam = (value: string | null) => {
  const parsed = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;
  return parsed && isValid(parsed) ? parsed : new Date();
};

// Форма працює з місцевими датою й часом окремо — як і при створенні
const toFormValues = (lesson: IPopulatedLesson): LessonFormValues => {
  const start = new Date(lesson.date);
  return {
    title: lesson.title,
    description: lesson.description ?? '',
    groupId: lesson.groupId,
    type: lesson.type,
    date: format(start, 'yyyy-MM-dd'),
    time: format(start, 'HH:mm'),
    duration: lesson.duration,
    teacherId: lesson.teacherId,
    homeworkDescription: lesson.homeworkDescription ?? '',
    homeworkDue: lesson.homeworkDueDate
      ? format(new Date(lesson.homeworkDueDate), 'yyyy-MM-dd')
      : '',
  };
};

export default function SchedulePage() {
  const { user } = useAuthStore();
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHER;

  const isPhone = useMediaQuery(PHONE_QUERY);

  // Тиждень/місяць, дата і відкрите заняття живуть в URL: дашборд веде одразу на
  // заняття, а перезавантаження чи «Назад» не повертають на поточний тиждень
  const [searchParams, setSearchParams] = useSearchParams();
  const view: ScheduleView = searchParams.get('view') === 'month' ? 'month' : 'week';
  const dateParam = searchParams.get('date');
  const date = useMemo(() => parseDateParam(dateParam), [dateParam]);
  const lessonId = searchParams.get('lesson');

  const updateParams = (patch: Record<string, string | null>) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(patch).forEach(([key, value]) =>
          value === null ? next.delete(key) : next.set(key, value)
        );
        return next;
      },
      { replace: true }
    );
  const setView = (next: ScheduleView) => updateParams({ view: next === 'week' ? null : next });
  const setDate = (next: Date) =>
    updateParams({ date: isToday(next) ? null : format(next, 'yyyy-MM-dd') });
  const selectLesson = (lesson: IPopulatedLesson | null) =>
    updateParams({ lesson: lesson?.id ?? null });

  const [lessons, setLessons] = useState<IPopulatedLesson[]>([]);
  // Заняття з посилання, якого немає у видимому діапазоні
  const [linkedLesson, setLinkedLesson] = useState<IPopulatedLesson | null>(null);
  const [loadedRangeKey, setLoadedRangeKey] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLesson, setEditingLesson] = useState<IPopulatedLesson | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // «Спробувати знову» після помилки завантаження — ефект перечитує той самий діапазон
  const [loadAttempt, setLoadAttempt] = useState(0);

  const range = useMemo(() => {
    return view === 'week'
      ? { from: startOfWeek(date, { weekStartsOn: 1 }), to: endOfWeek(date, { weekStartsOn: 1 }) }
      : { from: startOfMonth(date), to: endOfMonth(date) };
  }, [date, view]);

  const rangeKey = `${range.from.toISOString()}|${range.to.toISOString()}`;

  // Скелетон показуємо, поки завантажений діапазон не збігся з видимим. Так
  // стан завантаження не вимагає setState прямо в тілі ефекту (react-hooks).
  const isLoading = loadedRangeKey !== rangeKey;
  // Скелетон — лише до першої відповіді. Далі при гортанні тижнів календар лишається
  // на місці приглушеним, а не змінюється сірим прямокутником на 700px
  const isFirstLoad = loadedRangeKey === null;

  useEffect(() => {
    // Гортаємо тижні швидше, ніж відповідає сервер — запити проміжних
    // тижнів скасовуються, і календар не блимає чужими даними
    const controller = new AbortController();
    const { signal } = controller;

    const loadLessons = async () => {
      setLoadError(null);
      try {
        const data = await apiGetLessons(
          { from: range.from.toISOString(), to: range.to.toISOString() },
          { signal }
        );
        if (!signal.aborted) setLessons(data);
      } catch (error) {
        if (!signal.aborted && !isSilentError(error)) {
          setLoadError(getApiErrorMessage(error, 'Не вдалося завантажити розклад'));
        }
      } finally {
        if (!signal.aborted) setLoadedRangeKey(rangeKey);
      }
    };

    loadLessons();

    return () => controller.abort();
  }, [range, rangeKey, loadAttempt]);

  const lessonInRange = lessonId ? (lessons.find((item) => item.id === lessonId) ?? null) : null;
  const selectedLesson =
    lessonInRange ?? (linkedLesson && linkedLesson.id === lessonId ? linkedLesson : null);

  // Посилання на заняття поза завантаженим тижнем — дочитуємо його окремо
  useEffect(() => {
    if (!lessonId || isLoading || lessonInRange || linkedLesson?.id === lessonId) return;
    let cancelled = false;

    apiGetLessonById(lessonId)
      .then((lesson) => {
        if (!cancelled) setLinkedLesson(lesson);
      })
      .catch((error) => {
        if (cancelled) return;
        toastApiError(error, 'Не вдалося відкрити заняття');
        updateParams({ lesson: null });
      });

    return () => {
      cancelled = true;
    };
    // updateParams — нова функція на кожен рендер, а дочитувати треба лише при зміні id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, isLoading, lessonInRange, linkedLesson]);

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

  const visibleHours = useMemo(() => calendarHours(events), [events]);

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
    setDate(view === 'week' ? addWeeks(date, step) : addMonths(date, step));
  };

  const handleCreateLesson = async (values: ILessonDto | Partial<ILessonDto>) => {
    setIsSubmitting(true);
    try {
      // Без initialValues форма віддає повний payload — це створення
      const created = await apiCreateLesson(values as ILessonDto);
      setIsCreateOpen(false);
      toast.success('Заняття створено');

      // Додаємо відповідь сервера на місце замість перезапиту всього діапазону.
      // Заняття поза видимим тижнем/місяцем підтягнеться, коли туди перейдуть
      const start = new Date(created.date);
      if (start >= range.from && start <= range.to) {
        setLessons((current) =>
          [...current, created].sort((a, b) => +new Date(a.date) - +new Date(b.date))
        );
      }
    } catch (error) {
      toastApiError(error, 'Не вдалося створити заняття');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Заняття проведене, скасоване чи змінене: міняємо один запис, а не перечитуємо календар
  const handleLessonUpdated = (lesson: IPopulatedLesson) => {
    setLessons((current) => replaceById(current, lesson.id, lesson));
    if (linkedLesson?.id === lesson.id) setLinkedLesson(lesson);
  };

  // Деталі закриваються, щоб поверх календаря була одна модалка — форма
  const openEdit = (lesson: IPopulatedLesson) => {
    selectLesson(null);
    setEditingLesson(lesson);
  };

  const handleUpdateLesson = async (values: ILessonDto | Partial<ILessonDto>) => {
    if (!editingLesson) return;
    // Форма в режимі редагування віддає лише змінені поля; бекенд порожній PATCH відхиляє
    if (Object.keys(values).length === 0) {
      setEditingLesson(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await apiUpdateLesson(editingLesson.id, values);
      setEditingLesson(null);
      toast.success('Заняття збережено');

      // Перенесене за межі видимого тижня/місяця зникає з календаря
      const start = new Date(updated.date);
      setLessons((current) =>
        start >= range.from && start <= range.to
          ? replaceById(current, updated.id, updated).sort(
              (a, b) => +new Date(a.date) - +new Date(b.date)
            )
          : current.filter((lesson) => lesson.id !== updated.id)
      );
    } catch (error) {
      toastApiError(error, 'Не вдалося зберегти заняття');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button
            className="flex items-center gap-2 bg-[#C10000] hover:bg-[#A00000] text-white"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Додати заняття
          </Button>
        </div>
      )}

      <ScheduleToolbar
        label={rangeLabel}
        view={view}
        onView={setView}
        onNavigate={handleNavigate}
      />

      <LessonTypeLegend />

      {!isLoading && !loadError && events.length === 0 && (
        <EmptyState
          size="compact"
          icon={CalendarDays}
          title={`${view === 'week' ? 'На цьому тижні' : 'У цьому місяці'} занять немає`}
          description={canManage ? undefined : "Розклад з'явиться, щойно викладач додасть заняття."}
        >
          {canManage && (
            <Button
              className="bg-[#C10000] hover:bg-[#A00000] text-white"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4" /> Додати заняття
            </Button>
          )}
        </EmptyState>
      )}

      {loadError ? (
        <ErrorState
          title="Не вдалося завантажити розклад"
          description={loadError}
          onRetry={() => setLoadAttempt((value) => value + 1)}
        />
      ) : isPhone ? (
        // На телефоні сім колонок тижня не вміщаються — ті самі заняття списком за днями
        isFirstLoad ? (
          <div className="space-y-2" aria-busy="true" aria-label="Завантаження розкладу">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div
            aria-busy={isLoading}
            className={`transition-opacity ${isLoading ? 'opacity-60' : ''}`}
          >
            <ScheduleAgenda lessons={lessons} onSelect={selectLesson} />
          </div>
        )
      ) : (
        <div
          aria-busy={isLoading}
          className={`bg-white rounded-xl border border-slate-200 p-2 sm:p-4 overflow-x-auto transition-opacity ${isLoading && !isFirstLoad ? 'opacity-60' : ''}`}
        >
          {isFirstLoad ? (
            <Skeleton className="h-[700px] w-full rounded-lg" />
          ) : (
            <div className="min-w-[640px]">
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
                min={visibleHours.min}
                max={visibleHours.max}
                style={{ height: 700 }}
                eventPropGetter={(event) => ({
                  // Вибране заняття підсвічуємо, поки відкрита модалка деталей
                  className: `${LESSON_TYPE_META[event.resource.type].event}${
                    event.resource.status === LessonStatus.CANCELLED ? ' opacity-50' : ''
                  }${selectedLesson?.id === event.resource.id ? ' ring-2 ring-[#BA0000]' : ''}`,
                })}
                components={{ event: LessonEvent }}
                onSelectEvent={(event) => selectLesson(event.resource)}
                messages={{
                  next: 'Далі',
                  previous: 'Назад',
                  today: 'Сьогодні',
                  month: 'Місяць',
                  week: 'Тиждень',
                  noEventsInRange: 'Занять у цьому періоді немає',
                }}
              />
            </div>
          )}
        </div>
      )}

      <LessonDetailsModal
        lesson={selectedLesson}
        isOpen={Boolean(selectedLesson)}
        onClose={() => selectLesson(null)}
        onLessonUpdated={handleLessonUpdated}
        onEdit={openEdit}
      />

      <Dialog open={!!editingLesson} onOpenChange={(open) => !open && setEditingLesson(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Редагування заняття</DialogTitle>
          </DialogHeader>
          {editingLesson && (
            <LessonForm
              initialValues={toFormValues(editingLesson)}
              onSubmit={handleUpdateLesson}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Нове заняття</DialogTitle>
          </DialogHeader>
          <LessonForm onSubmit={handleCreateLesson} isSubmitting={isSubmitting} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
