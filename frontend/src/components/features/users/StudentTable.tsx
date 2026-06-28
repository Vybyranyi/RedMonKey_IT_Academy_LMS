import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import type { IUser } from '@redmonkey/shared';

interface StudentTableProps {
  students: IUser[];
  onViewDetails: (id: string) => void;
}

export default function StudentTable({ students, onViewDetails }: StudentTableProps) {
  const getGradeStyles = (score: number) => {
    if (score >= 10) return 'bg-emerald-100 text-emerald-700';
    if (score >= 7) return 'bg-blue-100 text-blue-700';
    if (score >= 4) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

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
            <TableHead className="w-[80px] text-center">Дія</TableHead>
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
            students.map((student: any) => {
              const avgScore = student.averageScore || 0;
              const attendance = student.attendance || 0;
              const displayCoins = student.redCoins || 0;

              return (
                <TableRow key={student._id} className="hover:bg-slate-50/50">
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
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-none rounded-full px-3 font-semibold text-xs">
                        {student.group.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-none rounded-full px-3 font-semibold text-xs">
                        Без групи
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs ${getGradeStyles(avgScore)}`}>
                        {Math.round(avgScore)}
                      </div>
                      <span className="text-sm font-medium text-slate-600">{avgScore}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="text-[16px] leading-none opacity-80 grayscale">🪙</span>
                      <span className="text-slate-800">+{displayCoins}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 w-32">
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`${attendance > 0 ? 'bg-emerald-600' : 'bg-slate-300'} h-1.5 rounded-full`}
                          style={{ width: `${attendance}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{attendance}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={student.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'}>
                      {student.isActive ? 'Активний' : 'Неактивний'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-slate-900"
                      onClick={() => onViewDetails(student._id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
