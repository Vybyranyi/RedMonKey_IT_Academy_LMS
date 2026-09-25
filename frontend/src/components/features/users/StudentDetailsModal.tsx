import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { IUserWithListStats } from '@redmonkey/shared';
import StudentActivity from './StudentActivity';

interface StudentDetailsModalProps {
  student: IUserWithListStats | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function StudentDetailsModal({
  student,
  isOpen,
  onClose,
}: StudentDetailsModalProps) {
  if (!student) return null;

  // Ті самі агрегати, що в рядку таблиці; null — даних ще немає або їх не видно
  const average = student.stats?.averageGrade ?? null;
  const attendance = student.stats?.attendanceRate ?? null;
  const redCoins = student.redCoins || 0;
  const enrollDate = student.createdAt
    ? new Date(student.createdAt).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short' })
    : '—';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-slate-50">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">
            {student.firstName} {student.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto px-6 pb-6 scrollbar-hide">
          <div className="space-y-6">
            {/* Top Profile Card */}
            <div className="bg-[#1A2645] rounded-2xl p-6 flex items-center gap-5 text-white shadow-sm mt-2">
              <Avatar className="h-20 w-20 border-2 border-white/20">
                <AvatarImage src={student.avatar || undefined} />
                <AvatarFallback className="bg-emerald-600 text-2xl font-bold text-white">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-2xl font-bold tracking-tight">
                  {student.firstName} {student.lastName}
                </h3>
                <p className="text-slate-300 text-sm">{student.email}</p>
                <div className="flex items-center gap-2 pt-1">
                  {student.group ? (
                    <Badge className="bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 border-none px-3 font-semibold">
                      {typeof student.group === 'object' ? student.group.name : 'Група'}
                    </Badge>
                  ) : (
                    <Badge className="bg-white/10 text-slate-300 hover:bg-white/20 border-none px-3 font-semibold">
                      Без групи
                    </Badge>
                  )}
                  <Badge
                    className={
                      student.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-none'
                        : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border-none'
                    }
                  >
                    {student.isActive ? 'Активний' : 'Неактивний'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span
                  className={`text-2xl font-bold ${average === null ? 'text-slate-400' : 'text-blue-600'}`}
                >
                  {average === null ? '—' : average.toFixed(1)}
                </span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">
                  Середній бал
                </span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-2xl font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="text-xl opacity-80 grayscale">🪙</span>
                  {redCoins}
                </span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">
                  RedCoins
                </span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span
                  className={`text-2xl font-bold ${attendance === null ? 'text-slate-400' : 'text-emerald-600'}`}
                >
                  {attendance === null ? '—' : `${attendance}%`}
                </span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">
                  Відвідуваність
                </span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-lg font-bold text-slate-700">{enrollDate}</span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">
                  Дата вступу
                </span>
              </div>
            </div>

            {/* stats: null — студент чужої групи. GET /grades і /coins/transactions для нього
                не дають 403, а мовчки звужують вибірку до занять і груп викладача — і картка
                показала б порожню історію, наче її немає. Тому не питаємо зовсім */}
            {student.stats === null ? (
              <div className="bg-white border border-slate-100 border-dashed rounded-xl p-6 text-center shadow-sm">
                <p className="text-slate-400 text-sm font-medium">
                  Оцінки й історію RedCoins видно лише для студентів ваших груп
                </p>
              </div>
            ) : (
              <StudentActivity key={student.id} studentId={student.id} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
