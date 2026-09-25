import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { UserRole } from '@redmonkey/shared';
import type {
  ICoinTransactionDto,
  ILeaderboardRow,
  IPopulatedCoinTransaction,
  IPopulatedGroup,
  IUser,
} from '@redmonkey/shared';
import {
  apiCreateCoinTransaction,
  apiGetCoinTransactions,
  apiGetLeaderboard,
  apiGetStudentBalance,
  type ICoinBalance,
} from '@/api/coins';
import { apiGetGroups } from '@/api/groups';
import { apiGetUsers } from '@/api/users';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/utils/apiError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CoinAwardForm from '@/components/features/coins/CoinAwardForm';
import CoinBalanceCard from '@/components/features/coins/CoinBalanceCard';
import CoinHistory from '@/components/features/coins/CoinHistory';
import CoinLeaderboard from '@/components/features/coins/CoinLeaderboard';

const LEADERBOARD_LIMIT = 50;

export default function CoinsPage() {
  const { user, setUser } = useAuthStore();

  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [students, setStudents] = useState<IUser[]>([]);
  const [leaderboard, setLeaderboard] = useState<ILeaderboardRow[]>([]);
  const [transactions, setTransactions] = useState<IPopulatedCoinTransaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [balance, setBalance] = useState<ICoinBalance | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [awardStudentId, setAwardStudentId] = useState('');
  // Лічильник завантажень історії з нуля: сторінка, що догрузилась після
  // перемикання групи, належить старій групі і має бути відкинута
  const historyRequestRef = useRef(0);

  const userId = user?.id;
  const isStudent = user?.role === UserRole.STUDENT;
  const canAward = user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHER;

  // Студент бачить рейтинг лише своєї групи — селектор групи йому не потрібен
  useEffect(() => {
    if (!userId || isStudent) return;
    let cancelled = false;

    const loadGroups = async () => {
      try {
        const data = await apiGetGroups();
        if (cancelled) return;

        // GET /groups віддає всі групи академії без звуження за роллю. Якщо
        // не відфільтрувати, викладач авто-обере чужу групу і отримає 403
        // при спробі нарахувати монети її студенту.
        const visible =
          user?.role === UserRole.TEACHER
            ? data.filter((group) => group.teachers.some((teacher) => teacher.id === user.id))
            : data;

        setGroups(visible);
        setGroupId((current) => current || visible[0]?.id || '');
      } catch (error) {
        if (!cancelled) toast.error(getApiErrorMessage(error, 'Не вдалося завантажити групи'));
      }
    };

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [userId, isStudent, user?.role, user?.id]);

  useEffect(() => {
    if (!userId) return;
    if (!isStudent && !groupId) return;
    let cancelled = false;

    const loadCoins = async () => {
      historyRequestRef.current += 1;
      setIsLoading(true);
      try {
        const [leaderboardData, transactionsPage, studentList, balanceData] = await Promise.all([
          apiGetLeaderboard({ groupId: isStudent ? undefined : groupId, limit: LEADERBOARD_LIMIT }),
          // Лише перша сторінка — решту історії користувач догружає кнопкою
          apiGetCoinTransactions({ groupId: isStudent ? undefined : groupId }),
          isStudent
            ? Promise.resolve<IUser[]>([])
            : apiGetUsers({ role: UserRole.STUDENT, groupId }),
          isStudent ? apiGetStudentBalance(userId) : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setLeaderboard(leaderboardData);
        setTransactions(transactionsPage.items);
        setNextCursor(transactionsPage.nextCursor);
        setStudents(studentList);
        setBalance(balanceData);

        // Віджет у сайдбарі показує redCoins зі стора — після нарахування
        // він застаріває, тож синхронізуємо його свіжим балансом
        const current = useAuthStore.getState().user;
        if (balanceData && current && current.redCoins !== balanceData.balance) {
          setUser({ ...current, redCoins: balanceData.balance });
        }
      } catch (error) {
        if (!cancelled) toast.error(getApiErrorMessage(error, 'Не вдалося завантажити RedCoins'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadCoins();

    return () => {
      cancelled = true;
    };
  }, [userId, isStudent, groupId, setUser]);

  const openForm = (studentId: string) => {
    setAwardStudentId(studentId);
    setIsFormOpen(true);
  };

  const loadMoreTransactions = async () => {
    if (!nextCursor) return;
    const request = historyRequestRef.current;

    setIsLoadingMore(true);
    try {
      const page = await apiGetCoinTransactions({
        groupId: isStudent ? undefined : groupId,
        cursor: nextCursor,
      });
      if (request !== historyRequestRef.current) return;

      setTransactions((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося завантажити історію'));
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Бали в рейтингу рахує сервер (User.redCoins), тож після нарахування
  // перезапитуємо лише рейтинг, а не всю сторінку
  const refreshLeaderboard = async () => {
    try {
      setLeaderboard(await apiGetLeaderboard({ groupId, limit: LEADERBOARD_LIMIT }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося оновити рейтинг'));
    }
  };

  const handleSubmit = async (data: ICoinTransactionDto) => {
    setIsSubmitting(true);
    let transaction: IPopulatedCoinTransaction;
    try {
      transaction = await apiCreateCoinTransaction(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося провести операцію'));
      return;
    } finally {
      setIsSubmitting(false);
    }

    toast.success(
      transaction.amount > 0
        ? `Нараховано ${transaction.amount} монет: ${transaction.student.firstName} ${transaction.student.lastName}`
        : `Списано ${Math.abs(transaction.amount)} монет: ${transaction.student.firstName} ${transaction.student.lastName}`
    );
    setIsFormOpen(false);

    // Нова транзакція — найсвіжіша, тож стає першою без повторного запиту історії:
    // уже підвантажені сторінки не скидаються, а курсор лишається дійсним
    setTransactions((current) => [transaction, ...current]);
    refreshLeaderboard();
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Заголовок і підзаголовок сторінки рендерить Header у AppLayout — тут лише лічильник і дія */}
      {!isStudent && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{students.length} студентів</Badge>

          {canAward && (
            <Button
              className="flex items-center gap-2 bg-[#C10000] hover:bg-[#A00000] text-white"
              onClick={() => openForm('')}
              disabled={students.length === 0}
            >
              <Plus className="h-4 w-4" /> Нарахувати монети
            </Button>
          )}
        </div>
      )}

      {!isStudent && (
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-full sm:w-64 h-11 bg-white border-slate-200">
              <SelectValue placeholder="Оберіть групу" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isStudent && (
          <div className="lg:col-span-1">
            <CoinBalanceCard balance={balance} isLoading={isLoading} />
          </div>
        )}

        <div className="lg:col-span-2">
          <CoinLeaderboard
            rows={leaderboard}
            isLoading={isLoading}
            highlightStudentId={isStudent ? user.id : undefined}
            onAward={canAward ? openForm : undefined}
          />
        </div>

        <div className={isStudent ? 'lg:col-span-3' : 'lg:col-span-1'}>
          <CoinHistory
            transactions={transactions}
            isLoading={isLoading}
            showStudent={!isStudent}
            hasMore={nextCursor !== null}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMoreTransactions}
          />
        </div>
      </div>

      {/* Форма монтується лише на час відкриття: так вона щоразу стартує з
          чистим станом і не памʼятає попередню операцію */}
      {canAward && isFormOpen && (
        <CoinAwardForm
          isOpen
          onClose={() => setIsFormOpen(false)}
          students={students}
          initialStudentId={awardStudentId}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
