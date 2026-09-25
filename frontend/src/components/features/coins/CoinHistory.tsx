import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronDown, History } from 'lucide-react';
import type { IPopulatedCoinTransaction } from '@redmonkey/shared';
import type { Pending } from '@/lib/optimistic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { COIN_CATEGORY_META, formatAmount, getAmountColor } from '@/lib/coinCategories';

interface CoinHistoryProps {
  /** isPending — транзакцію вже показано, але сервер її ще не підтвердив */
  transactions: Pending<IPopulatedCoinTransaction>[];
  isLoading: boolean;
  /** студент бачить лише свої транзакції — імʼя в рядку йому нічого не додає */
  showStudent?: boolean;
  /** Історія приходить сторінками: true — на сервері є ще старіші транзакції */
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function CoinHistory({
  transactions,
  isLoading,
  showStudent,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: CoinHistoryProps) {
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
              aria-busy={transaction.isPending || undefined}
              className={`flex items-start gap-3 rounded-xl border border-slate-100 p-3 transition-opacity ${
                transaction.isPending ? 'opacity-60' : ''
              }`}
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
                  {transaction.isPending
                    ? 'Зберігається…'
                    : format(new Date(transaction.createdAt), 'd MMMM yyyy, HH:mm', { locale: uk })}{' '}
                  · {transaction.issuer.firstName} {transaction.issuer.lastName}
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

        {!isLoading && hasMore && onLoadMore && (
          <Button
            variant="outline"
            className="w-full h-11 border-slate-200 text-slate-600"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              'Завантаження...'
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> Показати ще
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
