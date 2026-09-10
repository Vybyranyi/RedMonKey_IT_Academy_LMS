import { useMemo } from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import type { IPopulatedGrade, IPopulatedLesson, IGradeSummaryRow, IUser } from '@redmonkey/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAverageColor } from '@/lib/gradeColors';
import GradeCell from './GradeCell';

interface GradeJournalProps {
  students: IUser[];
  lessons: IPopulatedLesson[];
  grades: IPopulatedGrade[];
  summary: IGradeSummaryRow[];
  isLoading: boolean;
  canEdit: boolean;
  /** клітинка, яка зараз зберігається */
  savingCell: { studentId: string; lessonId: string } | null;
  onSaveGrade: (studentId: string, lessonId: string, value: number, comment: string) => void;
  onDeleteGrade: (gradeId: string) => void;
}

const cellKey = (studentId: string, lessonId: string) => `${studentId}:${lessonId}`;

export default function GradeJournal({
  students,
  lessons,
  grades,
  summary,
  isLoading,
  canEdit,
  savingCell,
  onSaveGrade,
  onDeleteGrade,
}: GradeJournalProps) {
  // Мапа замість пошуку по масиву в кожній клітинці: журнал це N студентів × M занять,
  // і find() всередині подвійного циклу дав би квадратичну складність на кожен рендер
  const gradeByCell = useMemo(() => {
    const map = new Map<string, IPopulatedGrade>();
    grades.forEach((grade) => map.set(cellKey(grade.studentId, grade.lessonId), grade));
    return map;
  }, [grades]);

  const summaryByStudent = useMemo(
    () => new Map(summary.map((row) => [row.studentId, row])),
    [summary]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
        <p className="text-slate-400 text-sm font-medium">У цій групі поки немає студентів</p>
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
        <p className="text-slate-400 text-sm font-medium">
          У цієї групи ще немає занять — журнал з'явиться після першого заняття
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-white z-10 min-w-[220px]">Студент</TableHead>
            {lessons.map((lesson) => (
              <TableHead key={lesson.id} className="text-center min-w-[72px]">
                <span className="block text-xs font-semibold text-slate-700">
                  {format(new Date(lesson.date), 'd MMM', { locale: uk })}
                </span>
                <span className="block text-[11px] text-slate-400 font-normal truncate max-w-[72px]">
                  {lesson.title}
                </span>
              </TableHead>
            ))}
            <TableHead className="text-center min-w-[90px]">Середнє</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {students.map((student) => {
            const row = summaryByStudent.get(student.id);
            const average = row?.average ?? null;

            return (
              <TableRow key={student.id} className="hover:bg-slate-50/50">
                <TableCell className="sticky left-0 bg-white z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={student.avatar || undefined} />
                      <AvatarFallback className="bg-[#0070F3] text-white text-xs font-bold">
                        {student.firstName.charAt(0)}
                        {student.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {student.firstName} {student.lastName}
                    </span>
                  </div>
                </TableCell>

                {lessons.map((lesson) => {
                  const key = cellKey(student.id, lesson.id);
                  const grade = gradeByCell.get(key) ?? null;

                  return (
                    <TableCell key={lesson.id} className="text-center">
                      <GradeCell
                        grade={grade}
                        editable={canEdit}
                        isSaving={
                          savingCell?.studentId === student.id && savingCell.lessonId === lesson.id
                        }
                        onSave={(value, comment) => onSaveGrade(student.id, lesson.id, value, comment)}
                        onDelete={grade ? () => onDeleteGrade(grade.id) : undefined}
                      />
                    </TableCell>
                  );
                })}

                <TableCell className="text-center">
                  <span
                    className={`inline-flex h-9 min-w-[48px] items-center justify-center rounded-md border px-2 text-sm font-bold ${getAverageColor(average)}`}
                  >
                    {average === null ? '—' : average.toFixed(1)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
