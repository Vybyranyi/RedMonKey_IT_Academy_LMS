import { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import type { IPopulatedGrade, IPopulatedLesson, IUser } from '@redmonkey/shared';
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
import EmptyState from '@/components/common/EmptyState';
import { getAverageColor } from '@/lib/gradeColors';
import type { Pending } from '@/lib/optimistic';
import GradeCell from './GradeCell';

/** Оцінка в журналі: isPending — показана оптимістично, сервер ще не відповів. */
export type JournalGrade = Pending<IPopulatedGrade>;

/** current — оцінка, що вже стоїть у клітинці (null — нова). */
export type SaveGradeHandler = (
  student: IUser,
  lesson: IPopulatedLesson,
  current: JournalGrade | null,
  value: number,
  comment: string
) => void;

interface GradeJournalProps {
  students: IUser[];
  lessons: IPopulatedLesson[];
  grades: JournalGrade[];
  isLoading: boolean;
  canEdit: boolean;
  /** Тип оцінок у журналі — підпис під «Середнє», бо середнє рахується лише з нього */
  typeLabel: string;
  onSaveGrade: SaveGradeHandler;
  /** Лише для адміна — API не дає викладачу видаляти оцінки */
  onDeleteGrade?: (grade: JournalGrade) => void;
}

type Cells = ReadonlyMap<string, JournalGrade>;

const EMPTY_CELLS: Cells = new Map();

export default function GradeJournal({
  students,
  lessons,
  grades,
  isLoading,
  canEdit,
  typeLabel,
  onSaveGrade,
  onDeleteGrade,
}: GradeJournalProps) {
  // Оцінки розкладаємо по студентах (studentId → lessonId → оцінка): рядок отримує
  // лише свої клітинки, і пошук у подвійному циклі не стає квадратичним
  const cellsByStudent = useMemo(() => {
    const byStudent = new Map<string, Map<string, JournalGrade>>();
    grades.forEach((grade) => {
      let cells = byStudent.get(grade.studentId);
      if (!cells) {
        cells = new Map();
        byStudent.set(grade.studentId, cells);
      }
      cells.set(grade.lessonId, grade);
    });
    return byStudent;
  }, [grades]);

  // Середнє рахуємо з тих самих оцінок, що й клітинки (та сама вибірка, що в
  // GET /grades/summary): після оптимістичного оновлення воно змінюється разом
  // із клітинкою, без повторного запиту
  const averageByStudent = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    grades.forEach((grade) => {
      const total = totals.get(grade.studentId) ?? { sum: 0, count: 0 };
      totals.set(grade.studentId, { sum: total.sum + grade.value, count: total.count + 1 });
    });
    return new Map([...totals].map(([studentId, { sum, count }]) => [studentId, sum / count]));
  }, [grades]);

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Завантаження журналу">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        title="У цій групі поки немає студентів"
        description="Журнал з'явиться, щойно адміністратор додасть студентів до групи."
      />
    );
  }

  if (lessons.length === 0) {
    return (
      <EmptyState
        title="У цієї групи ще немає занять"
        description="Журнал з'явиться після першого заняття в розкладі."
      />
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-white z-10 min-w-[160px] sm:min-w-[220px]">
              Студент
            </TableHead>
            {lessons.map((lesson) => (
              // Назва в два рядки замість обрізаної до 72px — повна є в title
              <TableHead
                key={lesson.id}
                className="text-center align-top min-w-[104px] max-w-[128px] whitespace-normal py-2"
                title={`${format(new Date(lesson.date), 'd MMMM', { locale: uk })} · ${lesson.title}`}
              >
                <span className="block text-xs font-semibold text-slate-700">
                  {format(new Date(lesson.date), 'd MMM', { locale: uk })}
                </span>
                <span className="block text-xs text-slate-500 font-normal leading-tight line-clamp-2">
                  {lesson.title}
                </span>
              </TableHead>
            ))}
            {/* «Середнє» прилипає праворуч: при прокрутці довгого журналу воно лишається видимим */}
            <TableHead className="sticky right-0 z-10 bg-white text-center min-w-[90px] shadow-[-1px_0_0_#e2e8f0]">
              <span className="block text-xs font-semibold text-slate-700">Середнє</span>
              <span className="block text-xs text-slate-500 font-normal">{typeLabel}</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {students.map((student) => (
            <GradeJournalRow
              key={student.id}
              student={student}
              lessons={lessons}
              cells={cellsByStudent.get(student.id) ?? EMPTY_CELLS}
              average={averageByStudent.get(student.id) ?? null}
              canEdit={canEdit}
              onSaveGrade={onSaveGrade}
              onDeleteGrade={onDeleteGrade}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface GradeJournalRowProps {
  student: IUser;
  lessons: IPopulatedLesson[];
  cells: Cells;
  average: number | null;
  canEdit: boolean;
  onSaveGrade: SaveGradeHandler;
  onDeleteGrade?: (grade: JournalGrade) => void;
}

const sameCells = (a: Cells, b: Cells) => {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const [lessonId, grade] of a) {
    if (b.get(lessonId) !== grade) return false;
  }
  return true;
};

/**
 * Map клітинок будується заново при кожній зміні grades, тож її порівнюємо за
 * вмістом. Оцінки, яких зміна не стосується, лишаються тими самими об'єктами
 * (див. lib/optimistic.ts) — тому рядки інших студентів не перерендерюються.
 */
const areRowPropsEqual = (prev: GradeJournalRowProps, next: GradeJournalRowProps) =>
  prev.student === next.student &&
  prev.lessons === next.lessons &&
  prev.average === next.average &&
  prev.canEdit === next.canEdit &&
  prev.onSaveGrade === next.onSaveGrade &&
  prev.onDeleteGrade === next.onDeleteGrade &&
  sameCells(prev.cells, next.cells);

const GradeJournalRow = memo(function GradeJournalRow({
  student,
  lessons,
  cells,
  average,
  canEdit,
  onSaveGrade,
  onDeleteGrade,
}: GradeJournalRowProps) {
  // Липкі клітинки непрозорі (під ними проїжджає вміст), тож підсвіт рядка їм дає group-hover
  return (
    <TableRow className="group hover:bg-slate-50/50">
      <TableCell className="sticky left-0 z-10 bg-white group-hover:bg-slate-50">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={student.avatar || undefined} />
            <AvatarFallback className="bg-avatar text-white text-xs font-bold">
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
        const grade = cells.get(lesson.id) ?? null;

        return (
          <TableCell key={lesson.id} className="text-center">
            <GradeCell
              grade={grade}
              editable={canEdit}
              cellLabel={`${student.firstName} ${student.lastName}, ${format(new Date(lesson.date), 'd MMM', { locale: uk })} «${lesson.title}»`}
              isSaving={grade?.isPending}
              onSave={(value, comment) => onSaveGrade(student, lesson, grade, value, comment)}
              onDelete={grade && onDeleteGrade ? () => onDeleteGrade(grade) : undefined}
            />
          </TableCell>
        );
      })}

      <TableCell className="sticky right-0 z-10 bg-white text-center shadow-[-1px_0_0_#e2e8f0] group-hover:bg-slate-50">
        <span
          className={`inline-flex h-9 min-w-[48px] items-center justify-center rounded-md border px-2 text-sm font-bold ${getAverageColor(average)}`}
        >
          {average === null ? '—' : average.toFixed(1)}
        </span>
      </TableCell>
    </TableRow>
  );
}, areRowPropsEqual);
