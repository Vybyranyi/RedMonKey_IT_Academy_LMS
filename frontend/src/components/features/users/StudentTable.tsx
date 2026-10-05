import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Coins as CoinsIcon, Eye, Pencil, UserX } from 'lucide-react';
import type { IUser, IUserWithListStats } from '@redmonkey/shared';
import { getAverageColor } from '@/lib/gradeColors';
import { NARROW_QUERY, useMediaQuery } from '@/lib/useMediaQuery';

interface StudentTableProps {
  students: IUserWithListStats[];
  onViewDetails: (id: string) => void;
  onEdit?: (student: IUser) => void;
  onDeactivate?: (student: IUser) => void;
}

type RowProps = Omit<StudentTableProps, 'students'> & { student: IUserWithListStats };

/** Підказка до «—»: даних ще немає чи їх не можна показувати. */
const emptyHint = (student: IUserWithListStats, value: number | null, noDataHint: string) => {
  if (value !== null) return undefined;
  // stats: null — студент чужої групи: список викладачу видно, статистику — ні
  return student.stats === null ? 'Статистика доступна лише для студентів ваших груп' : noDataHint;
};

/**
 * Шість колонок на телефоні гортались вбік, і бал з відвідуваністю були за межею
 * екрана. Вужче за md — та сама інформація картками, ширше — таблиця.
 */
export default function StudentTable({ students, ...handlers }: StudentTableProps) {
  const isNarrow = useMediaQuery(NARROW_QUERY);

  if (isNarrow) {
    return (
      <ul className="space-y-3" aria-label="Студенти">
        {students.length === 0 ? (
          <li className="bg-white border rounded-xl p-6 text-center text-slate-500 font-medium">
            Студентів не знайдено
          </li>
        ) : (
          students.map((student) => (
            <StudentCard key={student.id} student={student} {...handlers} />
          ))
        )}
      </ul>
    );
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Студент</TableHead>
            <TableHead>Група</TableHead>
            <TableHead>Середній бал</TableHead>
            <TableHead>RedCoins</TableHead>
            <TableHead>Відвідуваність</TableHead>
            <TableHead className="w-[120px] text-center">Дія</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                Студентів не знайдено
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow key={student.id} className="hover:bg-slate-50/50">
                <TableCell>
                  <StudentIdentity student={student} />
                </TableCell>
                <TableCell>
                  <GroupBadge student={student} />
                </TableCell>
                <TableCell>
                  <AverageBadge student={student} />
                </TableCell>
                <TableCell>
                  <Coins student={student} />
                </TableCell>
                <TableCell>
                  <AttendanceBar student={student} />
                </TableCell>
                <TableCell className="text-center">
                  <RowActions student={student} {...handlers} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function StudentCard({ student, ...handlers }: RowProps) {
  return (
    <li className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
      <StudentIdentity student={student} />
      <GroupBadge student={student} />
      <dl className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
        <div className="space-y-1">
          <dt className="text-xs text-slate-500">Середній бал</dt>
          <dd>
            <AverageBadge student={student} />
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-slate-500">RedCoins</dt>
          <dd>
            <Coins student={student} />
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-slate-500">Відвідуваність</dt>
          <dd>
            <AttendanceBar student={student} />
          </dd>
        </div>
      </dl>
      <div className="flex justify-end border-t border-slate-100 pt-2">
        <RowActions student={student} {...handlers} />
      </div>
    </li>
  );
}

function StudentIdentity({ student }: { student: IUserWithListStats }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={student.avatar || undefined} />
        <AvatarFallback className="bg-avatar text-xs font-bold text-white">
          {student.firstName[0]}
          {student.lastName[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-slate-800 truncate">
          {student.firstName} {student.lastName}
        </span>
        <span className="text-sm text-slate-600 truncate">{student.email}</span>
      </div>
    </div>
  );
}

function GroupBadge({ student }: { student: IUserWithListStats }) {
  return student.group ? (
    <Badge
      variant="outline"
      className="bg-blue-50 text-blue-600 border-none rounded-full px-3 font-semibold text-xs shrink-0"
    >
      {typeof student.group === 'object' ? student.group.name : 'Група'}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="bg-slate-100 text-slate-600 border-none rounded-full px-3 font-semibold text-xs shrink-0"
    >
      Без групи
    </Badge>
  );
}

function AverageBadge({ student }: { student: IUserWithListStats }) {
  // null — оцінок ще немає: це «—», а не нуль у червоній плашці
  const average = student.stats?.averageGrade ?? null;
  return (
    <span
      className={`inline-flex h-7 min-w-[40px] items-center justify-center rounded-md border px-2 text-xs font-bold ${getAverageColor(average)}`}
      title={emptyHint(student, average, 'Оцінок ще немає')}
    >
      {average === null ? '—' : average.toFixed(1)}
    </span>
  );
}

function Coins({ student }: { student: IUserWithListStats }) {
  return (
    <span className="font-bold text-slate-800 flex items-center gap-1.5">
      <CoinsIcon className="h-4 w-4 text-amber-500" aria-hidden="true" />
      {student.redCoins || 0}
    </span>
  );
}

function AttendanceBar({ student }: { student: IUserWithListStats }) {
  const attendance = student.stats?.attendanceRate ?? null;
  return (
    <div
      className="flex items-center gap-3 max-w-32"
      title={emptyHint(student, attendance, 'Відміток явки ще немає')}
    >
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        {attendance !== null && (
          <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${attendance}%` }} />
        )}
      </div>
      <span
        className={`text-xs font-semibold ${attendance === null ? 'text-slate-500' : 'text-slate-600'}`}
      >
        {attendance === null ? '—' : `${attendance}%`}
      </span>
    </div>
  );
}

function RowActions({ student, onViewDetails, onEdit, onDeactivate }: RowProps) {
  const fullName = `${student.firstName} ${student.lastName}`;
  return (
    <div className="flex justify-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-500 hover:text-slate-900"
        onClick={() => onViewDetails(student.id)}
        aria-label={`Переглянути картку: ${fullName}`}
      >
        <Eye className="h-4 w-4" />
      </Button>
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-slate-900"
          onClick={() => onEdit(student)}
          aria-label={`Редагувати: ${fullName}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDeactivate && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-brand"
          onClick={() => onDeactivate(student)}
          aria-label={`Деактивувати: ${fullName}`}
        >
          <UserX className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
