import { Coins, Trophy } from 'lucide-react';
import type { ILeaderboardRow } from '@redmonkey/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getPositionColor } from '@/lib/coinCategories';

interface CoinLeaderboardProps {
  rows: ILeaderboardRow[];
  isLoading: boolean;
  /** id користувача, чий рядок треба підсвітити (студент бачить себе в списку) */
  highlightStudentId?: string;
  /** передається лише для admin/teacher — тоді в рядку зʼявляється кнопка нарахування */
  onAward?: (studentId: string) => void;
}

export default function CoinLeaderboard({
  rows,
  isLoading,
  highlightStudentId,
  onAward,
}: CoinLeaderboardProps) {
  return (
    <Card className="border-t-2 border-t-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Trophy className="h-4 w-4 text-amber-500" />
          Рейтинг
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {isLoading &&
          [1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-14 w-full rounded-xl" />)}

        {!isLoading && rows.length === 0 && (
          <p className="text-slate-400 text-sm font-medium text-center py-6 border border-dashed border-slate-200 rounded-xl">
            Рейтинг порожній — монети ще нікому не нараховували
          </p>
        )}

        {!isLoading &&
          rows.map((row) => (
            <div
              key={row.studentId}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                row.studentId === highlightStudentId
                  ? 'border-[#C10000]/30 bg-red-50/50'
                  : 'border-slate-100 bg-slate-50/50'
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${getPositionColor(row.position)}`}
              >
                {row.position}
              </span>

              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage
                  src={row.avatar ?? undefined}
                  alt={`${row.firstName} ${row.lastName}`}
                />
                <AvatarFallback className="bg-[#0070F3] text-white text-xs font-semibold">
                  {row.firstName.charAt(0)}
                  {row.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {row.firstName} {row.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate">{row.groupName ?? 'Без групи'}</p>
              </div>

              <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-slate-900">
                <Coins className="h-4 w-4 text-amber-500" />
                {row.redCoins}
              </span>

              {onAward && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onAward(row.studentId)}
                >
                  Нарахувати
                </Button>
              )}
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
