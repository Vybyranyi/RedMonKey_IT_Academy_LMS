import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { IUser } from '@redmonkey/shared';

interface StudentDetailsModalProps {
  student: IUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function StudentDetailsModal({ student, isOpen, onClose }: StudentDetailsModalProps) {
  if (!student) return null;

  const avgScore = (student as any).averageScore || 0;
  const attendance = (student as any).attendance || 0;
  const redCoins = student.redCoins || 0;
  const enrollDate = student.createdAt ? new Date(student.createdAt).toLocaleDateString('uk-UA', { year: 'numeric', month: 'short' }) : '—';
  
  // Real data arrays would go here when backend supports them
  const grades: any[] = (student as any).grades || []; 
  const transactions: any[] = (student as any).transactions || [];

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
                      {typeof student.group === 'object' ? (student.group as any).name : 'Група'}
                    </Badge>
                  ) : (
                    <Badge className="bg-white/10 text-slate-300 hover:bg-white/20 border-none px-3 font-semibold">
                      Без групи
                    </Badge>
                  )}
                  <Badge className={student.isActive ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-none' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border-none'}>
                    {student.isActive ? 'Активний' : 'Неактивний'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-2xl font-bold text-blue-600">{avgScore > 0 ? avgScore.toFixed(1) : '0.0'}</span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Середній бал</span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-2xl font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="text-xl opacity-80 grayscale">🪙</span>
                  {redCoins}
                </span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">RedCoins</span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-2xl font-bold text-emerald-600">{attendance}%</span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Відвідуваність</span>
              </div>
              <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm text-center">
                <span className="text-lg font-bold text-slate-700">{enrollDate}</span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">Дата вступу</span>
              </div>
            </div>

            {/* Grades Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-lg">Оцінки</h4>
              {grades.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {grades.map((grade, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                      <div className="bg-emerald-100 text-emerald-700 font-bold w-9 h-9 rounded flex items-center justify-center shrink-0">
                        {grade.score}
                      </div>
                      <span className="text-sm font-medium text-slate-700 line-clamp-1">{grade.topic}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-100 border-dashed rounded-xl p-6 text-center shadow-sm">
                  <p className="text-slate-400 text-sm font-medium">Оцінки ще не виставлені</p>
                </div>
              )}
            </div>

            {/* Transactions Section */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-lg">Транзакції RedCoins</h4>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((tx, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl opacity-80">{tx.amount > 0 ? '🪙' : '💸'}</div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{tx.reason}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{tx.author} - {tx.date}</p>
                        </div>
                      </div>
                      <div className={`font-bold text-lg ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-100 border-dashed rounded-xl p-6 text-center shadow-sm">
                  <p className="text-slate-400 text-sm font-medium">Історія транзакцій порожня</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
