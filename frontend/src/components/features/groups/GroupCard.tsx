import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, MoreHorizontal, Pencil, Archive, UsersRound } from 'lucide-react';
import type { IPopulatedGroup } from '@redmonkey/shared';
import { UserAvatarGroup } from '@/components/ui/user-avatar-group';

interface GroupCardProps {
  group: IPopulatedGroup;
  onEdit?: (group: IPopulatedGroup) => void;
  onDeactivate?: (group: IPopulatedGroup) => void;
}

const formatDate = (value: IPopulatedGroup['startDate']) =>
  value ? format(new Date(value), 'd MMM yyyy', { locale: uk }) : '—';

export default function GroupCard({ group, onEdit, onDeactivate }: GroupCardProps) {
  const hasActions = Boolean(onEdit || onDeactivate);

  return (
    <Card className="hover:shadow-md transition-shadow relative overflow-hidden border-t-2 border-t-slate-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1 pr-4 min-w-0">
          <CardTitle className="text-xl font-bold text-slate-800">{group.name}</CardTitle>
          <CardDescription className="line-clamp-2 mt-1">
            {group.description || 'Напрямок навчання'}
          </CardDescription>
        </div>
        <div className="p-3 bg-red-50 text-primary rounded-xl">
          <UsersRound className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 border-t border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>
              {formatDate(group.startDate)} – {formatDate(group.endDate)}
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
      <CardFooter className="bg-slate-50/50 rounded-b-lg border-t border-slate-100 py-3 flex justify-end gap-1">
        {/* Склад групи — це та сама таблиця студентів з балами й відвідуваністю, лише з фільтром */}
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-slate-900 font-semibold"
          asChild
        >
          <Link to={`/students?groupId=${group.id}`}>Переглянути склад</Link>
        </Button>

        {/* modal={false}: пункти меню відкривають діалог, а модальне меню, закриваючись,
            повертало б фокус на свій тригер і лишало body з pointer-events: none */}
        {hasActions && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-900"
                aria-label={`Дії з групою ${group.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onSelect={() => onEdit(group)}>
                  <Pencil /> Редагувати
                </DropdownMenuItem>
              )}
              {onDeactivate && (
                <DropdownMenuItem variant="destructive" onSelect={() => onDeactivate(group)}>
                  <Archive /> Деактивувати
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardFooter>
    </Card>
  );
}
