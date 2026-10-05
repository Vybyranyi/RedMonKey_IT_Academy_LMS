import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { IUser } from '@redmonkey/shared';
import type { TeacherGroupsSummary } from '@/lib/teacherGroups';
import EmptyState from '@/components/common/EmptyState';
import { UsersRound } from 'lucide-react';

interface TeacherDetailsModalProps {
  teacher: IUser | null;
  summary: TeacherGroupsSummary;
  isOpen: boolean;
  onClose: () => void;
}

export default function TeacherDetailsModal({
  teacher,
  summary,
  isOpen,
  onClose,
}: TeacherDetailsModalProps) {
  if (!teacher) return null;

  const { groups, studentsCount } = summary;
  const hireDate = teacher.createdAt
    ? new Date(teacher.createdAt).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short' })
    : '—';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-slate-50">
        {/* Назва діалогу — для скрінрідера: на екрані ім'я вже є у великій картці нижче */}
        <DialogHeader className="sr-only">
          <DialogTitle className="text-xl font-bold text-slate-900">
            {teacher.firstName} {teacher.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto px-6 pt-8 pb-6 scrollbar-hide">
          <div className="space-y-6">
            {/* Top Profile Card */}
            <div className="bg-title rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 text-white shadow-sm mt-2">
              <Avatar className="h-20 w-20 border-2 border-white/20">
                <AvatarImage src={teacher.avatar || undefined} />
                <AvatarFallback className="bg-avatar text-2xl font-bold text-white">
                  {teacher.firstName[0]}
                  {teacher.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-2xl font-bold tracking-tight">
                  {teacher.firstName} {teacher.lastName}
                </h3>
                <p className="text-slate-300 text-sm break-all">{teacher.email}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge className="bg-white/10 text-slate-300 hover:bg-white/20 border-none px-3 font-semibold">
                    Викладач
                  </Badge>
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-2xl font-bold text-blue-600">{groups.length}</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
                  Групи
                </span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-2xl font-bold text-emerald-600">{studentsCount}</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
                  Студенти
                </span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-lg font-bold text-slate-700">{hireDate}</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
                  Дата приєднання
                </span>
              </div>
            </div>

            {/* Groups Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-lg">Групи</h4>
              {groups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm"
                    >
                      <span className="text-sm font-bold text-slate-700">{group.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  size="compact"
                  icon={UsersRound}
                  title="Викладач не закріплений за групами"
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
