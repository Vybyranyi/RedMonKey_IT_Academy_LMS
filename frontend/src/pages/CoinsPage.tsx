import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CircleDollarSign, Plus } from 'lucide-react';
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
import { getApiErrorMessage, isSilentError, toastApiError } from '@/utils/apiError';
import { applyCoinsToLeaderboard } from '@/lib/leaderboard';
import { createTempId, removeById, replaceById, type Pending } from '@/lib/optimistic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import CoinAwardForm from '@/components/features/coins/CoinAwardForm';
import CoinBalanceCard from '@/components/features/coins/CoinBalanceCard';
import CoinHistory from '@/components/features/coins/CoinHistory';
import CoinLeaderboard from '@/components/features/coins/CoinLeaderboard';

const LEADERBOARD_LIMIT = 50;

type HistoryItem = Pending<IPopulatedCoinTransaction>;

export default function CoinsPage() {
  const { user, setUser } = useAuthStore();

  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [students, setStudents] = useState<IUser[]>([]);
  const [leaderboard, setLeaderboard] = useState<ILeaderboardRow[]>([]);
  const [transactions, setTransactions] = useState<HistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [balance, setBalance] = useState<ICoinBalance | null>(null);

  const [isGroupsLoading, setIsGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [awardStudentId, setAwardStudentId] = useState('');
  const [groupsAttempt, setGroupsAttempt] = useState(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  // Лічильник завантажень історії з нуля: сторінка, що догрузилась після
  // перемикання групи, належить старій групі і має бути відкинута
  const historyRequestRef = useRef(0);

  const userId = user?.id;
  const isStudent = user?.role === UserRole.STUDENT;
  const isTeacher = user?.role === UserRole.TEACHER;
  const canAward = user?.role === UserRole.ADMIN || isTeacher;

  // Студент бачить рейтинг лише своєї групи — селектор групи йому не потрібен
  useEffect(() => {
    if (!userId || isStudent) return;
    let cancelled = false;

    const loadGroups = async () => {
      setIsGroupsLoading(true);
      setGroupsError(null);
      try {
        const data = await apiGetGroups();
        if (cancelled) return;

        // GET /groups віддає всі групи академії без звуження за роллю. Якщо
        // не відфільтрувати, викладач авто-обере чужу групу і отримає 403
        // при спробі нарахувати монети її студенту.
        const visible = isTeacher
          ? data.filter((group) => group.teachers.some((teacher) => teacher.id === userId))
          : data;

        setGroups(visible);
        setGroupId((current) => current || visible[0]?.id || '');
      } catch (error) {
        if (!cancelled && !isSilentError(error)) {
          setGroupsError(getApiErrorMessage(error, 'Не вдалося завантажити групи'));
        }
      } finally {
        if (!cancelled) setIsGroupsLoading(false);
      }
    };

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [userId, isStudent, isTeacher, groupsAttempt]);

  useEffect(() => {
    if (!userId) return;
    if (!isStudent && !groupId) return;
    // Перемкнули групу до відповіді — запити старої групи скасовуються
    const controller = new AbortController();
    const { signal } = controller;

    const loadCoins = async () => {
      historyRequestRef.current += 1;
      setIsLoading(true);
      setLoadError(null);
      try {
        const [leaderboardData, transactionsPage, studentList, balanceData] = await Promise.all([
          apiGetLeaderboard(
            { groupId: isStudent ? undefined : groupId, limit: LEADERBOARD_LIMIT },
            { signal }
          ),
          // Лише перша сторінка — решту історії користувач догружає кнопкою
          apiGetCoinTransactions({ groupId: isStudent ? undefined : groupId }, { signal }),
          isStudent
            ? Promise.resolve<IUser[]>([])
            : apiGetUsers({ role: UserRole.STUDENT, groupId }, { signal }),
          isStudent ? apiGetStudentBalance(userId, { signal }) : Promise.resolve(null),
        ]);

        if (signal.aborted) return;
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
        if (!signal.aborted && !isSilentError(error)) {
          setLoadError(getApiErrorMessage(error, 'Не вдалося завантажити RedCoins'));
        }
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    };

    loadCoins();

    return () => controller.abort();
  }, [userId, isStudent, groupId, setUser, loadAttempt]);

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
      toastApiError(error, 'Не вдалося завантажити історію');
    } finally {
      setIsLoadingMore(false);
    }
  };

  /** Баланс студента живе в трьох місцях сторінки — міняємо всі разом. */
  const applyBalanceChange = (studentId: string, delta: number) => {
    setLeaderboard((rows) => applyCoinsToLeaderboard(rows, studentId, delta));
    setStudents((list) =>
      list.map((student) =>
        student.id === studentId ? { ...student, redCoins: student.redCoins + delta } : student
      )
    );
  };

  // Оптимістично: форма закривається одразу, транзакція стає першою в історії,
  // баланс у рейтингу змінюється — запит іде у фоні. Помилка (наприклад,
  // «Недостатньо монет») відкочує рівно цю операцію
  const handleSubmit = async (data: ICoinTransactionDto) => {
    const student = students.find((item) => item.id === data.studentId);
    if (!user || !student) return;

    const pending: HistoryItem = {
      ...data,
      id: createTempId(),
      issuedBy: user.id,
      createdAt: new Date().toISOString(),
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
      issuer: { id: user.id, firstName: user.firstName, lastName: user.lastName },
      isPending: true,
    };

    setIsFormOpen(false);
    setTransactions((current) => [pending, ...current]);
    applyBalanceChange(data.studentId, data.amount);

    try {
      const transaction = await apiCreateCoinTransaction(data);
      // Курсор пагінації лишається дійсним: підвантажені сторінки не скидаються
      setTransactions((current) => replaceById(current, pending.id, transaction));
      toast.success(
        transaction.amount > 0
          ? `Нараховано ${transaction.amount} монет: ${student.firstName} ${student.lastName}`
          : `Списано ${Math.abs(transaction.amount)} монет: ${student.firstName} ${student.lastName}`
      );
    } catch (error) {
      setTransactions((current) => removeById(current, pending.id));
      // Відкат зворотною дельтою, а не знімком стану: інші операції, що
      // пройшли за цей час, мають лишитися
      applyBalanceChange(data.studentId, -data.amount);
      toastApiError(error, 'Не вдалося провести операцію');
    }
  };

  if (!user) return null;

  if (!isStudent && groupsError) {
    return (
      <ErrorState
        title="Не вдалося завантажити групи"
        description={groupsError}
        onRetry={() => setGroupsAttempt((value) => value + 1)}
      />
    );
  }

  if (!isStudent && !isGroupsLoading && groups.length === 0) {
    return isTeacher ? (
      <EmptyState
        icon={CircleDollarSign}
        title="Ви ще не закріплені за жодною групою"
        description="Нараховувати монети можна студентам груп, які ви ведете."
      />
    ) : (
      <EmptyState
        icon={CircleDollarSign}
        title="Груп ще немає"
        description="Рейтинг і нарахування ведуться в межах групи — спершу створіть її."
      >
        <Button className="bg-[#C10000] hover:bg-[#A00000] text-white" asChild>
          <Link to="/groups">Перейти до груп</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок і підзаголовок сторінки рендерить Header у AppLayout — тут лише лічильник і дія */}
      {!isStudent && (
        <div className="flex items-center justify-between gap-3">
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
          <Label htmlFor="coins-group" className="sr-only">
            Група
          </Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger
              id="coins-group"
              className="w-full sm:w-64 h-11 bg-white border-slate-200"
            >
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

      {loadError ? (
        <ErrorState
          title="Не вдалося завантажити RedCoins"
          description={loadError}
          onRetry={() => setLoadAttempt((value) => value + 1)}
        />
      ) : (
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
      )}

      {/* Форма монтується лише на час відкриття: так вона щоразу стартує з
          чистим станом і не памʼятає попередню операцію */}
      {canAward && isFormOpen && (
        <CoinAwardForm
          isOpen
          onClose={() => setIsFormOpen(false)}
          students={students}
          initialStudentId={awardStudentId}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
