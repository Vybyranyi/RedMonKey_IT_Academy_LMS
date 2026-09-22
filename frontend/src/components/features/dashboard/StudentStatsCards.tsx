import { CalendarCheck, Coins, GraduationCap } from 'lucide-react';
import type { IUserStats } from '@redmonkey/shared';
import { Skeleton } from '@/components/ui/skeleton';
import StatCard from './StatCard';

interface StudentStatsCardsProps {
  stats: IUserStats | null;
  isLoading: boolean;
}

export default function StudentStatsCards({ stats, isLoading }: StudentStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-24 rounded-xl w-full" />
        ))}
      </div>
    );
  }

  // null означає «даних ще немає» — показуємо прочерк, а не нуль,
  // щоб студент без оцінок не бачив «середній бал 0»
  const average = stats?.grades.average;
  const rate = stats?.attendance.rate;
  // rate рахує запізнення і поважну причину як присутність, тож у підказці
  // має стояти те саме число — інакше «100%» стоятиме поряд з «0 із 1»
  const attended =
    (stats?.attendance.present ?? 0) +
    (stats?.attendance.late ?? 0) +
    (stats?.attendance.excused ?? 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <StatCard
        label="Середній бал"
        value={average == null ? '—' : average.toFixed(1)}
        icon={GraduationCap}
        hint={`${stats?.grades.count ?? 0} оцінок`}
      />
      <StatCard
        label="Відвідуваність"
        value={rate == null ? '—' : `${rate}%`}
        icon={CalendarCheck}
        hint={`${attended} із ${stats?.attendance.total ?? 0} занять`}
      />
      <StatCard
        label="Баланс RedCoins"
        value={stats?.coins.balance ?? 0}
        icon={Coins}
        hint={`+${stats?.coins.earned ?? 0} / −${stats?.coins.spent ?? 0}`}
      />
    </div>
  );
}
