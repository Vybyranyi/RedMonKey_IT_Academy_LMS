import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import type { IPopulatedCoinTransaction, IPopulatedGrade } from '@redmonkey/shared';
import { apiGetGrades } from '@/api/grades';
import { apiGetCoinTransactions } from '@/api/coins';
import ErrorState from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAmount, getAmountColor } from '@/lib/coinCategories';
import { GRADE_TYPE_META, getGradeColor } from '@/lib/gradeColors';
import { getApiErrorMessage, isSilentError } from '@/utils/apiError';

const RECENT_GRADES = 6;
const RECENT_TRANSACTIONS = 5;

interface StudentActivityProps {
  studentId: string;
}

interface Activity {
  grades: IPopulatedGrade[];
  gradesTotal: number;
  transactions: IPopulatedCoinTransaction[];
}

const EmptyBox = ({ text }: { text: string }) => (
  <div className="bg-white border border-slate-100 border-dashed rounded-xl p-6 text-center shadow-sm">
    <p className="text-slate-400 text-sm font-medium">{text}</p>
  </div>
);

/** Останні оцінки й транзакції RedCoins студента — секції StudentDetailsModal. */
export default function StudentActivity({ studentId }: StudentActivityProps) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      setActivity(null);
      setLoadError(null);
      try {
        const [grades, page] = await Promise.all([
          apiGetGrades({ studentId }, { signal }),
          apiGetCoinTransactions({ studentId, limit: RECENT_TRANSACTIONS }, { signal }),
        ]);
        if (signal.aborted) return;
        setActivity({
          // API віддає оцінки за датою заняття від старих до нових — у картці свіжі першими
          grades: grades.slice(-RECENT_GRADES).reverse(),
          gradesTotal: grades.length,
          transactions: page.items,
        });
      } catch (error) {
        if (!signal.aborted && !isSilentError(error)) {
          setLoadError(getApiErrorMessage(error, 'Не вдалося завантажити оцінки й транзакції'));
        }
      }
    };

    load();

    return () => controller.abort();
  }, [studentId, loadAttempt]);

  if (loadError) {
    return (
      <ErrorState
        className="p-6 md:p-6"
        title="Не вдалося завантажити оцінки й транзакції"
        description={loadError}
        onRetry={() => setLoadAttempt((value) => value + 1)}
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="font-bold text-slate-800 text-lg">Оцінки</h4>
          {activity && activity.gradesTotal > activity.grades.length && (
            <span className="text-xs text-slate-400 font-medium">
              останні {activity.grades.length} із {activity.gradesTotal}
            </span>
          )}
        </div>
        {!activity ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-busy="true">
            {[1, 2].map((n) => (
              <Skeleton key={n} className="h-[62px] rounded-xl" />
            ))}
          </div>
        ) : activity.grades.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activity.grades.map((grade) => (
              <div
                key={grade.id}
                className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-sm"
              >
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-bold ${getGradeColor(grade.value)}`}
                >
                  {grade.value}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {grade.lesson.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(grade.lesson.date), 'd MMM yyyy', { locale: uk })} ·{' '}
                    {GRADE_TYPE_META[grade.type].label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyBox text="Оцінки ще не виставлені" />
        )}
      </div>

      <div className="space-y-3">
        <h4 className="font-bold text-slate-800 text-lg">Транзакції RedCoins</h4>
        {!activity ? (
          <div className="space-y-3" aria-busy="true">
            {[1, 2].map((n) => (
              <Skeleton key={n} className="h-[68px] rounded-xl" />
            ))}
          </div>
        ) : activity.transactions.length > 0 ? (
          <div className="space-y-3">
            {activity.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{transaction.reason}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {transaction.issuer.firstName} {transaction.issuer.lastName} ·{' '}
                    {format(new Date(transaction.createdAt), 'd MMMM yyyy', { locale: uk })}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-bold text-lg tabular-nums ${getAmountColor(transaction.amount)}`}
                >
                  {formatAmount(transaction.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyBox text="Історія транзакцій порожня" />
        )}
      </div>
    </>
  );
}
