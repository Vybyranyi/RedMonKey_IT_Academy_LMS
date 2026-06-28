import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { IUser } from '@redmonkey/shared';

interface TeacherCardProps {
  teacher: IUser;
}

export default function TeacherCard({ teacher }: TeacherCardProps) {
  // Replace with actual data when available from backend
  const subjects = (teacher as any).subjects || [];
  const groups = (teacher as any).groups || [];
  const groupsCount = groups.length;
  const studentsCount = (teacher as any).studentsCount || 0;

  // Helper for mock avatar colors based on name length or something simple
  const avatarColors = ['bg-orange-600', 'bg-emerald-600', 'bg-blue-600'];
  const colorClass = avatarColors[(teacher.firstName.length + teacher.lastName.length) % avatarColors.length];

  return (
    <Card className="hover:shadow-md transition-all border border-slate-100 rounded-[20px] shadow-sm bg-white">
      <CardHeader className="flex flex-col items-center pb-2 pt-8 text-center">
        <Avatar className={`h-20 w-20 shadow-sm border-0 ${colorClass} text-white`}>
          <AvatarFallback className={`${colorClass} text-2xl font-bold text-white`}>
            {teacher.firstName[0]}
            {teacher.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-[18px] font-bold text-[#1A2645] mt-4 tracking-tight">
          {teacher.firstName} {teacher.lastName}
        </CardTitle>
        <CardDescription className="text-sm font-medium text-slate-400 mt-1">
          {subjects.length > 0 ? subjects.join(', ') : 'Не призначено предметів'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-3 text-center">
        {groups.length > 0 ? (
          <div className="flex justify-center flex-wrap gap-2">
            {groups.map((grp: string, idx: number) => (
              <Badge key={idx} variant="outline" className={`${idx % 2 === 0 ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'} border-none rounded-full px-3 font-semibold text-xs`}>
                {grp}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-none rounded-full px-3 font-semibold text-xs">
              Немає груп
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-2 pt-5 pb-2 border-t border-slate-100 text-slate-600 relative w-48 mx-auto">
          <div className="flex flex-col items-center">
            <span className="font-extrabold text-slate-800 text-lg leading-tight">{groupsCount}</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">груп</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-extrabold text-slate-800 text-lg leading-tight">{studentsCount}</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">студентів</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
