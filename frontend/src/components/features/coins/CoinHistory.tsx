import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { History } from 'lucide-react';
import type { IPopulatedCoinTransaction } from '@redmonkey/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { COIN_CATEGORY_META, formatAmount, getAmountColor } from '@/lib/coinCategories';

interface CoinHistoryProps {
  transactions: IPopulatedCoinTransaction[];
  isLoading: boolean;
  /** студент бачить лише свої транзакції — імʼя в рядку йому нічого не додає */
  showStudent?: boolean;
}

export default function CoinHistory({ transactions, isLoading, showStudent }: CoinHistoryProps) {
  return (
    <Card className="border-t-2 border-t-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <History className="h-4 w-4 text-slate-400" />
          Історія транзакцій
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {isLoading && [1, 2, 3].map((n) => <Skeleton key={n} className="h-16 w-full rounded-xl" />)}

        {!isLoading && transactions.length === 0 && (
          <p className="text-slate-400 text-sm font-medium text-center py-6 border border-dashed border-slate-200 rounded-xl">
            Транзакцій ще немає
          </p>
        )}

        {!isLoading &&
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
            >
              <span
                className={`shrink-0 text-base font-bold tabular-nums ${getAmountColor(transaction.amount)}`}
              >
                {formatAmount(transaction.amount)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {showStudent && (
                    <span className="text-slate-500">
                      {transaction.student.firstName} {transaction.student.lastName} ·{' '}
                    </span>
                  )}
                  {transaction.reason}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {format(new Date(transaction.createdAt), 'd MMMM yyyy, HH:mm', { locale: uk })} ·{' '}
                  {transaction.issuer.firstName} {transaction.issuer.lastName}
                </p>
              </div>

              <Badge
                variant="outline"
                className={`shrink-0 ${COIN_CATEGORY_META[transaction.category].badge}`}
              >
                {COIN_CATEGORY_META[transaction.category].label}
              </Badge>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
