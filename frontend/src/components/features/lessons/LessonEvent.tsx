import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { LessonStatus, type IPopulatedLesson } from '@redmonkey/shared';
import { LESSON_STATUS_META } from '@/lib/lessonStatuses';

interface LessonEventProps {
  event: { title: string; start: Date; resource: IPopulatedLesson };
}

export default function LessonEvent({ event }: LessonEventProps) {
  const { status } = event.resource;
  const isCancelled = status === LessonStatus.CANCELLED;

  return (
    // Статус не лише кольором: скасоване — закреслене й підписане, проведене — з галочкою
    <div className="h-full px-2 py-1.5 overflow-hidden">
      <p
        className={`flex items-center gap-1 text-xs font-bold leading-tight ${isCancelled ? 'line-through' : ''}`}
      >
        {status === LessonStatus.COMPLETED && (
          <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
        )}
        <span className="truncate">{event.title}</span>
        {status === LessonStatus.COMPLETED && (
          <span className="sr-only">, {LESSON_STATUS_META[status].label.toLowerCase()}</span>
        )}
      </p>
      <p className="text-xs opacity-75 mt-0.5">
        {format(event.start, 'HH:mm')}
        {isCancelled && ' · скасовано'}
      </p>
    </div>
  );
}
