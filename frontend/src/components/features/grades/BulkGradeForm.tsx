import { useState } from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { GRADE_MAX, GRADE_MIN, GradeType } from '@redmonkey/shared';
import type { IBulkGradeDto, IPopulatedLesson, IUser } from '@redmonkey/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { GRADE_TYPE_META } from '@/lib/gradeColors';

interface BulkGradeFormProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: IPopulatedLesson[];
  students: IUser[];
  isSubmitting: boolean;
  onSubmit: (data: IBulkGradeDto) => void;
}

export default function BulkGradeForm({
  isOpen,
  onClose,
  lessons,
  students,
  isSubmitting,
  onSubmit,
}: BulkGradeFormProps) {
  // Стан ініціалізується один раз: батько ремонтує форму через key на кожне
  // відкриття, тож скидати її ефектом не треба
  const [lessonId, setLessonId] = useState(() => lessons[0]?.id ?? '');
  const [type, setType] = useState<GradeType>(GradeType.CLASSWORK);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fillAll = (value: string) => {
    setValues(Object.fromEntries(students.map((student) => [student.id, value])));
  };

  const handleSubmit = () => {
    if (!lessonId) {
      setError('Оберіть заняття');
      return;
    }

    // Порожнє поле означає «цьому студенту оцінку не ставимо», а не нуль
    const grades = students
      .filter((student) => values[student.id]?.trim())
      .map((student) => ({ studentId: student.id, value: Number(values[student.id]) }));

    if (grades.length === 0) {
      setError('Виставте оцінку хоча б одному студенту');
      return;
    }

    const invalid = grades.find(
      (grade) => !Number.isInteger(grade.value) || grade.value < GRADE_MIN || grade.value > GRADE_MAX
    );
    if (invalid) {
      setError(`Оцінка має бути цілим числом від ${GRADE_MIN} до ${GRADE_MAX}`);
      return;
    }

    setError(null);
    onSubmit({ lessonId, type, grades });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Масове виставлення оцінок</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-lesson">Заняття</Label>
            <Select value={lessonId} onValueChange={setLessonId}>
              <SelectTrigger id="bulk-lesson" className="bg-white h-11">
                <SelectValue placeholder="Оберіть заняття" />
              </SelectTrigger>
              <SelectContent>
                {lessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {format(new Date(lesson.date), 'd MMM', { locale: uk })} · {lesson.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-type">Тип оцінки</Label>
            <Select value={type} onValueChange={(next) => setType(next as GradeType)}>
              <SelectTrigger id="bulk-type" className="bg-white h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GRADE_TYPE_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-fill">Поставити всім</Label>
            <div className="flex items-center gap-2">
              <Input
                id="bulk-fill"
                type="number"
                min={GRADE_MIN}
                max={GRADE_MAX}
                placeholder={`${GRADE_MIN}–${GRADE_MAX}`}
                onChange={(event) => fillAll(event.target.value)}
              />
              <Button variant="outline" onClick={() => setValues({})} disabled={isSubmitting}>
                Очистити
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {students.length === 0 && (
              <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm font-medium">У цій групі немає студентів</p>
              </div>
            )}

            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between gap-3 border border-slate-100 rounded-xl p-3"
              >
                <span className="text-sm font-medium text-slate-700 truncate">
                  {student.firstName} {student.lastName}
                </span>
                <Input
                  type="number"
                  min={GRADE_MIN}
                  max={GRADE_MAX}
                  className="w-20 shrink-0"
                  aria-label={`Оцінка для ${student.firstName} ${student.lastName}`}
                  value={values[student.id] ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [student.id]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <Button
            className="w-full h-11 bg-[#C10000] hover:bg-[#A00000] text-white"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Збереження...' : 'Зберегти все'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
