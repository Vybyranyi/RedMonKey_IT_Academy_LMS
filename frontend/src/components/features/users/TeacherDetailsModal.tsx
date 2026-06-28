import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { IUser } from '@redmonkey/shared';

interface TeacherDetailsModalProps {
  teacher: IUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TeacherDetailsModal({ teacher, isOpen, onClose }: TeacherDetailsModalProps) {
  if (!teacher) return null;

  const subjects = (teacher as any).subjects || [];
  const groups = (teacher as any).groups || [];
  const groupsCount = groups.length;
  const studentsCount = (teacher as any).studentsCount || 0;
  const hireDate = teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short' }) : '—';
  
  const avatarColors = ['bg-orange-600', 'bg-emerald-600', 'bg-blue-600'];
  const colorClass = avatarColors[(teacher.firstName.length + teacher.lastName.length) % avatarColors.length];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-slate-50">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">
            {teacher.firstName} {teacher.lastName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[80vh] overflow-y-auto px-6 pb-6 scrollbar-hide">
          <div className="space-y-6">
            {/* Top Profile Card */}
            <div className="bg-[#1A2645] rounded-2xl p-6 flex items-center gap-5 text-white shadow-sm mt-2">
              <Avatar className={`h-20 w-20 border-2 border-white/20 ${colorClass}`}>
                <AvatarImage src={teacher.avatar || undefined} />
                <AvatarFallback className="text-2xl font-bold text-white">
                  {teacher.firstName[0]}
                  {teacher.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-2xl font-bold tracking-tight">
                  {teacher.firstName} {teacher.lastName}
                </h3>
                <p className="text-slate-300 text-sm">{teacher.email}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge className={teacher.isActive ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-none' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border-none'}>
                    {teacher.isActive ? 'Активний' : 'Неактивний'}
                  </Badge>
                  <Badge className="bg-white/10 text-slate-300 hover:bg-white/20 border-none px-3 font-semibold">
                    Викладач
                  </Badge>
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-2xl font-bold text-blue-600">{groupsCount}</span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Групи</span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-2xl font-bold text-emerald-600">{studentsCount}</span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Студенти</span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-lg font-bold text-slate-700">{hireDate}</span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Дата приєднання</span>
              </div>
            </div>

            {/* Subjects Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-lg">Предмети</h4>
              {subjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subj: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="bg-white border border-slate-200 text-slate-700 px-3 py-1 text-sm font-medium">
                      {subj}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-100 border-dashed rounded-xl p-6 text-center shadow-sm">
                  <p className="text-slate-400 text-sm font-medium">Предмети ще не призначені</p>
                </div>
              )}
            </div>

            {/* Groups Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-lg">Групи</h4>
              {groups.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {groups.map((grp: string, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                      <span className="text-sm font-bold text-slate-700">{grp}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-100 border-dashed rounded-xl p-6 text-center shadow-sm">
                  <p className="text-slate-400 text-sm font-medium">Викладач не закріплений за групами</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
