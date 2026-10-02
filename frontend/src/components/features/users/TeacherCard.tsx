import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, UserX } from 'lucide-react';
import type { IUser } from '@redmonkey/shared';
import type { TeacherGroupsSummary } from '@/lib/teacherGroups';
import { pluralize } from '@/utils/stringUtils';

interface TeacherCardProps {
  teacher: IUser;
  summary: TeacherGroupsSummary;
  onViewDetails?: (id: string) => void;
  onEdit?: (teacher: IUser) => void;
  onDeactivate?: (teacher: IUser) => void;
}

export default function TeacherCard({
  teacher,
  summary,
  onViewDetails,
  onEdit,
  onDeactivate,
}: TeacherCardProps) {
  const fullName = `${teacher.firstName} ${teacher.lastName}`;

  return (
    <Card className="hover:shadow-md transition-all border border-slate-100 rounded-[20px] shadow-sm bg-white relative group">
      <div className="absolute top-3 right-3 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
        {onViewDetails && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm"
            onClick={() => onViewDetails(teacher.id)}
            aria-label={`Переглянути картку: ${fullName}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm"
            onClick={() => onEdit(teacher)}
            aria-label={`Редагувати: ${fullName}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {onDeactivate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-white/80 hover:bg-red-50 text-slate-500 hover:text-[#C10000] shadow-sm"
            onClick={() => onDeactivate(teacher)}
            aria-label={`Деактивувати: ${fullName}`}
          >
            <UserX className="h-4 w-4" />
          </Button>
        )}
      </div>

      <CardHeader className="flex flex-col items-center pb-2 pt-8 text-center">
        <Avatar className="h-20 w-20 shadow-sm border-0">
          <AvatarImage src={teacher.avatar || undefined} />
          <AvatarFallback className="bg-[#0070F3] text-2xl font-bold text-white">
            {teacher.firstName[0]}
            {teacher.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-[18px] font-bold text-[#1A2645] mt-4 tracking-tight">
          {fullName}
        </CardTitle>
        <CardDescription className="text-sm font-medium text-slate-500 mt-1 break-all">
          {teacher.email}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-3 text-center">
        <div className="flex justify-center flex-wrap gap-2">
          {summary.groups.length > 0 ? (
            summary.groups.map((group) => (
              <Badge
                key={group.id}
                variant="outline"
                className="bg-blue-50 text-blue-700 border-none rounded-full px-3 font-semibold text-xs"
              >
                {group.name}
              </Badge>
            ))
          ) : (
            <Badge
              variant="outline"
              className="bg-slate-100 text-slate-600 border-none rounded-full px-3 font-semibold text-xs"
            >
              Не закріплений за групами
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 pt-5 pb-2 border-t border-slate-100 text-slate-600 w-48 mx-auto">
          <div className="flex flex-col items-center">
            <span className="font-extrabold text-slate-800 text-lg leading-tight">
              {summary.groups.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {pluralize(summary.groups.length, ['група', 'групи', 'груп'])}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-extrabold text-slate-800 text-lg leading-tight">
              {summary.studentsCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {pluralize(summary.studentsCount, ['студент', 'студенти', 'студентів'])}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
