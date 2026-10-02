import { format, isToday } from 'date-fns';
import { uk } from 'date-fns/locale';
import { CheckCircle2 } from 'lucide-react';
import { LessonStatus, type IPopulatedLesson } from '@redmonkey/shared';
import { LESSON_TYPE_META } from '@/lib/lessonTypes';

interface ScheduleAgendaProps {
  /** Заняття видимого тижня чи місяця, відсортовані за часом */
  lessons: IPopulatedLesson[];
  onSelect: (lesson: IPopulatedLesson) => void;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Розклад на телефоні: сім колонок тижня не вміщаються в 375px, а календар,
 * що гортається вбік, ховає половину тижня. Тут — ті самі заняття списком за днями.
 */
export default function ScheduleAgenda({ lessons, onSelect }: ScheduleAgendaProps) {
  const days = new Map<string, IPopulatedLesson[]>();
  lessons.forEach((lesson) => {
    const key = format(new Date(lesson.date), 'yyyy-MM-dd');
    days.set(key, [...(days.get(key) ?? []), lesson]);
  });

  return (
    <div className="space-y-5">
      {[...days.entries()].map(([key, dayLessons]) => {
        const day = new Date(dayLessons[0].date);
        return (
          <section key={key} aria-label={format(day, 'EEEE, d MMMM', { locale: uk })}>
            <h3 className="mb-2 text-sm font-bold text-[#1A2645]">
              {capitalize(format(day, 'EEEE, d MMMM', { locale: uk }))}
              {isToday(day) && (
                <span className="ml-2 text-xs font-semibold text-[#C10000]">сьогодні</span>
              )}
            </h3>
            <ul className="space-y-2">
              {dayLessons.map((lesson) => {
                const meta = LESSON_TYPE_META[lesson.type];
                const isCancelled = lesson.status === LessonStatus.CANCELLED;
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(lesson)}
                      className={`w-full text-left flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 ${isCancelled ? 'opacity-60' : ''}`}
                    >
                      <span className={`h-10 w-1.5 shrink-0 rounded-sm ${meta.dot}`} />
                      <span className="w-12 shrink-0 text-sm font-bold text-slate-800">
                        {format(new Date(lesson.date), 'HH:mm')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`flex items-center gap-1 text-sm font-semibold text-slate-800 ${isCancelled ? 'line-through' : ''}`}
                        >
                          {lesson.status === LessonStatus.COMPLETED && (
                            <CheckCircle2
                              className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                              aria-label="Проведено"
                            />
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {meta.label} · {lesson.group.name}
                          {isCancelled && ' · скасовано'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
