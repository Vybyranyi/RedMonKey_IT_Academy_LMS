import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { uk } from 'date-fns/locale';
import {
  Users,
  GraduationCap,
  BookOpenCheck,
  CalendarDays,
  Clock,
  ArrowRight,
  UsersRound,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import {
  UserRole,
  type ILeaderboardRow,
  type IPopulatedGroup,
  type IPopulatedLesson,
  type IUserStats,
} from '@redmonkey/shared';
import { apiGetLessons } from '@/api/lessons';
import { apiGetUsers, apiGetUserStats } from '@/api/users';
import { apiGetLeaderboard } from '@/api/coins';
import { apiGetGroups } from '@/api/groups';
import { getApiErrorMessage, isSilentError } from '@/utils/apiError';
import ErrorState from '@/components/common/ErrorState';
import { LESSON_TYPE_META } from '@/lib/lessonTypes';
import StatCard from '@/components/features/dashboard/StatCard';
import StudentStatsCards from '@/components/features/dashboard/StudentStatsCards';
import UpcomingLessons from '@/components/features/dashboard/UpcomingLessons';
import CoinLeaderboard from '@/components/features/coins/CoinLeaderboard';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [weekLessons, setWeekLessons] = useState<IPopulatedLesson[]>([]);
  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [leaderboard, setLeaderboard] = useState<ILeaderboardRow[]>([]);
  const [studentStats, setStudentStats] = useState<IUserStats | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    teachers: 0,
    groups: 0,
  });

  const userId = user?.id;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isTeacher = user?.role === UserRole.TEACHER;
  const isStudent = user?.role === UserRole.STUDENT;

  useEffect(() => {
    if (!userId) return;
    // Пішли з дашборду до відповіді — шість паралельних запитів скасовуються
    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const weekRange = {
          from: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
          to: endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
        };

        const [lessonsData, studentsData, teachersData, groupsData, leaderboardData, statsData] =
          await Promise.all([
            apiGetLessons(weekRange, { signal }),
            isAdmin ? apiGetUsers({ role: UserRole.STUDENT }, { signal }) : Promise.resolve([]),
            isAdmin ? apiGetUsers({ role: UserRole.TEACHER }, { signal }) : Promise.resolve([]),
            isAdmin || isTeacher ? apiGetGroups() : Promise.resolve([]),
            apiGetLeaderboard({ limit: 5 }, { signal }),
            isStudent ? apiGetUserStats(userId, { signal }) : Promise.resolve(null),
          ]);

        if (signal.aborted) return;

        setWeekLessons(lessonsData);
        setGroups(groupsData);
        setLeaderboard(leaderboardData);
        setStudentStats(statsData);
        setStats({
          students: studentsData.length,
          teachers: teachersData.length,
          groups: groupsData.length,
        });
      } catch (error) {
        if (!signal.aborted && !isSilentError(error)) {
          setLoadError(getApiErrorMessage(error, 'Не вдалося завантажити дані дашборду'));
        }
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [userId, isAdmin, isTeacher, isStudent, loadAttempt]);

  const now = new Date();
  const upcoming = weekLessons.filter((lesson) => new Date(lesson.date) >= now).slice(0, 5);
  const todayLessons = weekLessons.filter((lesson) => isToday(new Date(lesson.date)));
  const nextLesson = upcoming[0] ?? null;

  // GET /groups віддає всі активні групи академії без звуження за роллю,
  // тож картку «Мої групи» фільтруємо на місці за складом викладачів
  const myGroups = groups.filter((group) =>
    group.teachers.some((teacher) => teacher.id === user?.id)
  );

  const handleLessonSelect = () => {
    navigate('/schedule');
  };

  if (loadError) {
    return (
      <ErrorState
        title="Не вдалося завантажити дашборд"
        description={loadError}
        onRetry={() => setLoadAttempt((value) => value + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Відображення блоків за роллю */}
      {isAdmin && (
        <AdminDashboard
          stats={stats}
          weekLessonsCount={weekLessons.length}
          upcoming={upcoming}
          leaderboard={leaderboard}
          isLoading={isLoading}
          onSelectLesson={handleLessonSelect}
        />
      )}

      {isTeacher && (
        <TeacherDashboard
          todayLessons={todayLessons}
          upcoming={upcoming}
          groups={myGroups}
          leaderboard={leaderboard}
          isLoading={isLoading}
          onSelectLesson={handleLessonSelect}
        />
      )}

      {isStudent && (
        <StudentDashboard
          nextLesson={nextLesson}
          weekLessons={weekLessons}
          stats={studentStats}
          leaderboard={leaderboard}
          studentId={user?.id}
          isLoading={isLoading}
          onSelectLesson={handleLessonSelect}
        />
      )}
    </div>
  );
}

interface DashboardStats {
  students: number;
  teachers: number;
  groups: number;
}

interface AdminDashboardProps {
  stats: DashboardStats;
  weekLessonsCount: number;
  upcoming: IPopulatedLesson[];
  leaderboard: ILeaderboardRow[];
  isLoading: boolean;
  onSelectLesson: () => void;
}

function AdminDashboard({
  stats,
  weekLessonsCount,
  upcoming,
  leaderboard,
  isLoading,
  onSelectLesson,
}: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Картки статистики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl w-full" />
          ))
        ) : (
          <>
            <StatCard label="Студенти" value={stats.students} icon={Users} />
            <StatCard label="Викладачі" value={stats.teachers} icon={GraduationCap} />
            <StatCard label="Групи" value={stats.groups} icon={BookOpenCheck} />
            <StatCard
              label="Занять цього тижня"
              value={weekLessonsCount}
              icon={CalendarDays}
              hint="Включно з минулими"
            />
          </>
        )}
      </div>

      {/* Основна сітка */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <UpcomingLessons
            title="Найближчі заняття"
            lessons={upcoming}
            isLoading={isLoading}
            onSelect={onSelectLesson}
          />
          <CoinLeaderboard rows={leaderboard} isLoading={isLoading} />
        </div>

        {/* Швидкі посилання */}
        <Card className="border-t-2 border-t-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Швидкі дії</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" asChild className="w-full justify-between">
              <Link to="/students">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  Управління студентами
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-between">
              <Link to="/groups">
                <span className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-slate-500" />
                  Список груп
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-between">
              <Link to="/schedule">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  Розклад занять
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface TeacherDashboardProps {
  todayLessons: IPopulatedLesson[];
  upcoming: IPopulatedLesson[];
  groups: IPopulatedGroup[];
  leaderboard: ILeaderboardRow[];
  isLoading: boolean;
  onSelectLesson: () => void;
}

function TeacherDashboard({
  todayLessons,
  upcoming,
  groups,
  leaderboard,
  isLoading,
  onSelectLesson,
}: TeacherDashboardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <UpcomingLessons
          title="Сьогоднішні заняття"
          lessons={todayLessons}
          isLoading={isLoading}
          emptyText="Сьогодні занять немає"
          onSelect={onSelectLesson}
        />
        <UpcomingLessons
          title="Найближчі заняття"
          lessons={upcoming}
          isLoading={isLoading}
          onSelect={onSelectLesson}
        />
        <CoinLeaderboard rows={leaderboard} isLoading={isLoading} />
      </div>

      {/* Мої групи */}
      <Card className="border-t-2 border-t-slate-200 h-fit">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Мої групи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && [1, 2].map((n) => <Skeleton key={n} className="h-12 w-full rounded-xl" />)}

          {!isLoading && groups.length === 0 && (
            <p className="text-slate-400 text-sm font-medium text-center py-4 border border-dashed border-slate-200 rounded-xl">
              Ви не закріплені за жодною групою
            </p>
          )}

          {!isLoading &&
            groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-slate-500 truncate">{group.description}</p>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0">
                  {group.students.length} студ.
                </Badge>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

interface StudentDashboardProps {
  nextLesson: IPopulatedLesson | null;
  weekLessons: IPopulatedLesson[];
  stats: IUserStats | null;
  leaderboard: ILeaderboardRow[];
  studentId?: string;
  isLoading: boolean;
  onSelectLesson: () => void;
}

function StudentDashboard({
  nextLesson,
  weekLessons,
  stats,
  leaderboard,
  studentId,
  isLoading,
  onSelectLesson,
}: StudentDashboardProps) {
  const meta = nextLesson ? LESSON_TYPE_META[nextLesson.type] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-3">
        <StudentStatsCards stats={stats} isLoading={isLoading} />
      </div>

      <div className="lg:col-span-2 space-y-6">
        {/* Картка "Найближче заняття" */}
        <Card className="border-t-2 border-t-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Найближче заняття</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-28 w-full rounded-xl" />
            ) : nextLesson && meta ? (
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {nextLesson.group.name}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{nextLesson.title}</h3>
                  </div>
                  <Badge variant="secondary">{meta.label}</Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>{format(new Date(nextLesson.date), 'EEEE, d MMMM, HH:mm', { locale: uk })}</span>
                  </div>
                  <Button size="sm" onClick={onSelectLesson}>
                    Перейти до розкладу
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center">
                <p className="text-slate-400 text-sm font-medium">Найближчих занять не заплановано</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Розклад на тиждень */}
        <UpcomingLessons
          title="Найближчі заняття"
          lessons={weekLessons}
          isLoading={isLoading}
          onSelect={onSelectLesson}
        />
      </div>

      {/* Рейтинг своєї групи — для студента бекенд звужує вибірку сам */}
      <CoinLeaderboard rows={leaderboard} isLoading={isLoading} highlightStudentId={studentId} />
    </div>
  );
}
