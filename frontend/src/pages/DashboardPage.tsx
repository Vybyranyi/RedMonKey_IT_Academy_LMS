import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { uk } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Users,
  GraduationCap,
  BookOpenCheck,
  CalendarDays,
  Coins,
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
import { UserRole, type IPopulatedLesson, type IPopulatedGroup } from '@redmonkey/shared';
import { apiGetLessons } from '@/api/lessons';
import { apiGetUsers } from '@/api/users';
import { apiGetGroups } from '@/api/groups';
import { getApiErrorMessage } from '@/utils/apiError';
import { LESSON_TYPE_META } from '@/lib/lessonTypes';
import StatCard from '@/components/features/dashboard/StatCard';
import UpcomingLessons from '@/components/features/dashboard/UpcomingLessons';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [weekLessons, setWeekLessons] = useState<IPopulatedLesson[]>([]);
  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    teachers: 0,
    groups: 0,
  });

  const isAdmin = user?.role === UserRole.ADMIN;
  const isTeacher = user?.role === UserRole.TEACHER;
  const isStudent = user?.role === UserRole.STUDENT;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const weekRange = {
          from: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
          to: endOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
        };

        const [lessonsData, studentsData, teachersData, groupsData] = await Promise.all([
          apiGetLessons(weekRange),
          isAdmin ? apiGetUsers({ role: UserRole.STUDENT }) : Promise.resolve([]),
          isAdmin ? apiGetUsers({ role: UserRole.TEACHER }) : Promise.resolve([]),
          isAdmin || isTeacher ? apiGetGroups() : Promise.resolve([]),
        ]);

        setWeekLessons(lessonsData);
        setGroups(groupsData);
        setStats({
          students: studentsData.length,
          teachers: teachersData.length,
          groups: groupsData.length,
        });
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Не вдалося завантажити дані дашборду'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin, isTeacher]);

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

  return (
    <div className="space-y-6">
      {/* Шапка привітання */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Вітаємо, {user?.firstName}!
        </h1>
        <p className="text-slate-500 capitalize">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: uk })}
        </p>
      </div>

      {/* Відображення блоків за роллю */}
      {isAdmin && (
        <AdminDashboard
          stats={stats}
          weekLessonsCount={weekLessons.length}
          upcoming={upcoming}
          isLoading={isLoading}
          onSelectLesson={handleLessonSelect}
        />
      )}

      {isTeacher && (
        <TeacherDashboard
          todayLessons={todayLessons}
          upcoming={upcoming}
          groups={myGroups}
          isLoading={isLoading}
          onSelectLesson={handleLessonSelect}
        />
      )}

      {isStudent && (
        <StudentDashboard
          nextLesson={nextLesson}
          weekLessons={weekLessons}
          redCoins={user?.redCoins ?? 0}
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
  isLoading: boolean;
  onSelectLesson: () => void;
}

function AdminDashboard({
  stats,
  weekLessonsCount,
  upcoming,
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
        <div className="lg:col-span-2">
          <UpcomingLessons
            title="Найближчі заняття"
            lessons={upcoming}
            isLoading={isLoading}
            onSelect={onSelectLesson}
          />
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
  isLoading: boolean;
  onSelectLesson: () => void;
}

function TeacherDashboard({
  todayLessons,
  upcoming,
  groups,
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
  redCoins: number;
  isLoading: boolean;
  onSelectLesson: () => void;
}

function StudentDashboard({
  nextLesson,
  weekLessons,
  redCoins,
  isLoading,
  onSelectLesson,
}: StudentDashboardProps) {
  const meta = nextLesson ? LESSON_TYPE_META[nextLesson.type] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          title="Розклад на тиждень"
          lessons={weekLessons}
          isLoading={isLoading}
          onSelect={onSelectLesson}
        />
      </div>

      {/* Баланс RedCoins */}
      <div className="space-y-6">
        <Card className="border-t-2 border-t-slate-200">
          <CardContent className="p-6 text-center space-y-3">
            <div className="inline-flex p-3 bg-amber-50 text-amber-500 rounded-full">
              <Coins className="h-8 w-8" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900">{redCoins}</p>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Баланс RedCoins</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
