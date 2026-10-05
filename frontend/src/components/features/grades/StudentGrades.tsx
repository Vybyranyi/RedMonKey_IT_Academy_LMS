import { useMemo } from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import type { IPopulatedGrade } from '@redmonkey/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GRADE_TYPE_META, getAverageColor, getGradeColor } from '@/lib/gradeColors';
import EmptyState from '@/components/common/EmptyState';
import { NotebookPen } from 'lucide-react';

interface StudentGradesProps {
  grades: IPopulatedGrade[];
  isLoading: boolean;
}

export default function StudentGrades({ grades, isLoading }: StudentGradesProps) {
  const average = useMemo(() => {
    if (grades.length === 0) return null;
    return grades.reduce((sum, grade) => sum + grade.value, 0) / grades.length;
  }, [grades]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="Оцінок ще немає"
        description="Вони з'являться тут, щойно викладач виставить першу."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        {grades.map((grade) => (
          <div
            key={grade.id}
            className="flex items-center gap-4 bg-white border border-slate-100 rounded-xl p-4"
          >
            <span
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-lg font-bold ${getGradeColor(grade.value)}`}
            >
              {grade.value}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{grade.lesson.title}</p>
              <p className="text-sm text-slate-600 mt-0.5">
                {format(new Date(grade.lesson.date), 'd MMMM yyyy', { locale: uk })} ·{' '}
                {GRADE_TYPE_META[grade.type].label}
              </p>
              {grade.comment && (
                <p className="text-sm text-slate-600 mt-1 truncate">{grade.comment}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Card className="border-t-2 border-t-slate-200 h-fit">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Середній бал</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <span
            className={`inline-flex h-16 min-w-20 items-center justify-center rounded-xl border px-4 text-3xl font-bold ${getAverageColor(average)}`}
          >
            {average === null ? '—' : average.toFixed(1)}
          </span>
          <p className="text-sm text-slate-500">
            {grades.length}{' '}
            {grades.length === 1 ? 'оцінка' : grades.length < 5 ? 'оцінки' : 'оцінок'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
