import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LESSON_TYPE_META } from '@/lib/lessonTypes';
import type { IPopulatedLesson } from '@redmonkey/shared';

interface UpcomingLessonsProps {
  title: string;
  lessons: IPopulatedLesson[];
  isLoading?: boolean;
  emptyText?: string;
  onSelect?: (lesson: IPopulatedLesson) => void;
}

export default function UpcomingLessons({
  title,
  lessons,
  isLoading = false,
  emptyText = 'Запланованих занять немає',
  onSelect,
}: UpcomingLessonsProps) {
  return (
    <Card className="border-t-2 border-t-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && [1, 2, 3].map((n) => <Skeleton key={n} className="h-16 w-full rounded-xl" />)}

        {!isLoading && lessons.length === 0 && (
          <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center">
            <p className="text-slate-400 text-sm font-medium">{emptyText}</p>
          </div>
        )}

        {!isLoading &&
          lessons.map((lesson) => {
            const meta = LESSON_TYPE_META[lesson.type];
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => onSelect?.(lesson)}
                className="w-full text-left flex items-center gap-3 border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition-colors"
              >
                <span className={`h-10 w-1.5 rounded-sm shrink-0 ${meta.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{lesson.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {format(new Date(lesson.date), 'd MMM, HH:mm', { locale: uk })} · {lesson.group.name}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {meta.label}
                </Badge>
              </button>
            );
          })}
      </CardContent>
    </Card>
  );
}
