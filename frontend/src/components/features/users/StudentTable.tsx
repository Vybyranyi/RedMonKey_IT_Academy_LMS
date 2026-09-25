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
import { Eye, Pencil } from 'lucide-react';
import type { IUser, IUserWithListStats } from '@redmonkey/shared';
import { getAverageColor } from '@/lib/gradeColors';

interface StudentTableProps {
  students: IUserWithListStats[];
  onViewDetails: (id: string) => void;
  onEdit?: (student: IUser) => void;
}

/** Підказка до «—»: даних ще немає чи їх не можна показувати. */
const emptyHint = (student: IUserWithListStats, value: number | null, noDataHint: string) => {
  if (value !== null) return undefined;
  // stats: null — студент чужої групи: список викладачу видно, статистику — ні
  return student.stats === null ? 'Статистика доступна лише для студентів ваших груп' : noDataHint;
};

export default function StudentTable({ students, onViewDetails, onEdit }: StudentTableProps) {
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
            <TableHead>Статус</TableHead>
            <TableHead className="w-[100px] text-center">Дія</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                Студентів не знайдено
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => {
              // null — оцінок чи відміток ще немає: це «—», а не нуль у червоній плашці
              const average = student.stats?.averageGrade ?? null;
              const attendance = student.stats?.attendanceRate ?? null;
              const displayCoins = student.redCoins || 0;

              return (
                <TableRow key={student.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={student.avatar || undefined} />
                        <AvatarFallback className="bg-slate-100 text-xs font-bold text-slate-700">
                          {student.firstName[0]}
                          {student.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">
                          {student.firstName} {student.lastName}
                        </span>
                        <span className="text-xs text-slate-400">{student.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.group ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-600 border-none rounded-full px-3 font-semibold text-xs"
                      >
                        {typeof student.group === 'object' ? student.group.name : 'Група'}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-slate-100 text-slate-600 border-none rounded-full px-3 font-semibold text-xs"
                      >
                        Без групи
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex h-7 min-w-[40px] items-center justify-center rounded-md border px-2 text-xs font-bold ${getAverageColor(average)}`}
                      title={emptyHint(student, average, 'Оцінок ще немає')}
                    >
                      {average === null ? '—' : average.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="text-[16px] leading-none opacity-80 grayscale">🪙</span>
                      <span className="text-slate-800">+{displayCoins}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center gap-3 w-32"
                      title={emptyHint(student, attendance, 'Відміток явки ще немає')}
                    >
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        {attendance !== null && (
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full"
                            style={{ width: `${attendance}%` }}
                          />
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold ${attendance === null ? 'text-slate-400' : 'text-slate-600'}`}
                      >
                        {attendance === null ? '—' : `${attendance}%`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        student.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }
                    >
                      {student.isActive ? 'Активний' : 'Неактивний'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                        onClick={() => onViewDetails(student.id)}
                        aria-label="Переглянути картку студента"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          onClick={() => onEdit(student)}
                          aria-label="Редагувати студента"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
