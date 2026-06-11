import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, BookOpen } from 'lucide-react';
import type { IPopulatedGroup } from '@redmonkey/shared';
import { UserAvatarGroup } from '@/components/ui/user-avatar-group';

interface GroupCardProps {
  group: IPopulatedGroup;
  onViewDetails: (id: string) => void;
}

export default function GroupCard({ group, onViewDetails }: GroupCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow relative overflow-hidden border-t-2 border-t-slate-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1 pr-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-bold text-slate-800">{group.name}</CardTitle>
            <Badge className={group.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'}>
              {group.isActive ? 'Активна' : 'Неактивна'}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2 mt-1">
            {group.description || 'Напрямок навчання'}
          </CardDescription>
        </div>
        <div className="p-3 bg-red-50 text-primary rounded-xl">
          <BookOpen className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 border-t border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>
              {group.startDate ? new Date(group.startDate).toLocaleDateString() : '—'} -{' '}
              {group.endDate ? new Date(group.endDate).toLocaleDateString() : '—'}
            </span>
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Викладач:</span>{' '}
            {group.teachers.length > 0
              ? group.teachers.map((t) => `${t.firstName} ${t.lastName}`).join(', ')
              : 'Не призначено'}
          </div>
        </div>

        <UserAvatarGroup 
          users={group.students} 
          maxCount={5} 
          emptyMessage="Студентів немає" 
          countLabel="студ." 
          className="pt-2" 
        />
      </CardContent>
      <CardFooter className="bg-slate-50/50 rounded-b-lg border-t border-slate-100 py-3 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-slate-600 hover:text-slate-900 font-semibold"
          onClick={() => onViewDetails(group._id)}
        >
          Переглянути склад
        </Button>
      </CardFooter>
    </Card>
  );
}