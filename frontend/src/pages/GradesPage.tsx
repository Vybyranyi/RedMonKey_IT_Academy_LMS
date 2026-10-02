import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { BookOpenCheck, Plus } from 'lucide-react';
import { GradeType, UserRole } from '@redmonkey/shared';
import type { IBulkGradeDto, IPopulatedGroup, IPopulatedLesson, IUser } from '@redmonkey/shared';
import { apiGetGroups } from '@/api/groups';
import { apiGetLessons } from '@/api/lessons';
import { apiGetUsers } from '@/api/users';
import {
  apiCreateGrade,
  apiDeleteGrade,
  apiGetGrades,
  apiSaveBulkGrades,
  apiUpdateGrade,
} from '@/api/grades';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage, isSilentError, toastApiError } from '@/utils/apiError';
import { createTempId, removeById, replaceById, upsertById } from '@/lib/optimistic';
import { pluralize } from '@/utils/stringUtils';
import {
  ALL_PERIODS,
  defaultPeriod,
  journalLessons,
  journalMonths,
  lessonsInPeriod,
} from '@/lib/journalPeriods';
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
import { GRADE_TYPE_META } from '@/lib/gradeColors';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import BulkGradeForm from '@/components/features/grades/BulkGradeForm';
import GradeJournal, {
  type JournalGrade,
  type SaveGradeHandler,
} from '@/components/features/grades/GradeJournal';
import StudentGrades from '@/components/features/grades/StudentGrades';
import GradeLegend from '@/components/features/grades/GradeLegend';

const ALL_TYPES = 'all';
// Журнал викладача й адміна завжди показує один тип: на заняття в студента може бути
// по оцінці кожного типу, а клітинка журналу вміщає рівно одну
const DEFAULT_JOURNAL_TYPE = GradeType.CLASSWORK;

export default function GradesPage() {
  const { user } = useAuthStore();

  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  // null — «автоматично»: поточний місяць, якщо в ньому є заняття, інакше весь курс
  const [period, setPeriod] = useState<string | null>(null);
  // Студенту — усі свої оцінки списком (тип видно в рядку), решті — журнал одного типу
  const [type, setType] = useState<string>(() =>
    user?.role === UserRole.STUDENT ? ALL_TYPES : DEFAULT_JOURNAL_TYPE
  );

  const [students, setStudents] = useState<IUser[]>([]);
  const [lessons, setLessons] = useState<IPopulatedLesson[]>([]);
  const [grades, setGrades] = useState<JournalGrade[]>([]);

  const [isGroupsLoading, setIsGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  // Лічильник ремонтує форму на кожне відкриття, щоб вона не памʼятала
  // оцінки з попереднього заняття — і щоб обійтись без setState в ефекті
  const [bulkKey, setBulkKey] = useState(0);
  // «Спробувати знову» після помилки завантаження — перезапускає відповідний ефект
  const [groupsAttempt, setGroupsAttempt] = useState(0);
  const [journalAttempt, setJournalAttempt] = useState(0);

  const userId = user?.id;
  const isStudent = user?.role === UserRole.STUDENT;
  const isTeacher = user?.role === UserRole.TEACHER;
  const isAdmin = user?.role === UserRole.ADMIN;
  const canEdit = isAdmin || isTeacher;
  const gradeType = type === ALL_TYPES ? undefined : (type as GradeType);
  // Тип нових оцінок у журналі — завжди той, що обраний у фільтрі
  const journalType = gradeType ?? DEFAULT_JOURNAL_TYPE;

  // Студент дивиться лише свої оцінки — селектор групи йому не потрібен,
  // а бекенд усе одно звузить вибірку до нього
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
        // не відфільтрувати, викладач авто-обере чужу групу і отримає 403.
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
    // Перемкнули групу чи тип, поки журнал ще вантажився — старі запити
    // скасовуються, і відповідь для попередньої групи не перезапише нову
    const controller = new AbortController();
    const { signal } = controller;

    const loadJournal = async () => {
      setIsLoading(true);
      setJournalError(null);
      try {
        if (isStudent) {
          const data = await apiGetGrades({ type: gradeType }, { signal });
          if (!signal.aborted) setGrades(data);
          return;
        }

        const [studentList, lessonList, gradeList] = await Promise.all([
          apiGetUsers({ role: UserRole.STUDENT, groupId }, { signal }),
          apiGetLessons({ groupId }, { signal }),
          apiGetGrades({ groupId, type: gradeType }, { signal }),
        ]);

        if (signal.aborted) return;
        setStudents(studentList);
        setLessons(lessonList);
        setGrades(gradeList);
      } catch (error) {
        if (!signal.aborted && !isSilentError(error)) {
          setJournalError(getApiErrorMessage(error, 'Не вдалося завантажити журнал'));
        }
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    };

    loadJournal();

    return () => controller.abort();
  }, [userId, isStudent, groupId, gradeType, journalAttempt]);

  // Оцінка з'являється в клітинці одразу, запит іде у фоні. Колбек стабільний
  // (не залежить від grades), інакше memo рядків журналу не мав би сенсу
  const handleSaveGrade = useCallback<SaveGradeHandler>(
    async (student, lesson, current, value, comment) => {
      if (!user) return;

      const now = new Date().toISOString();
      const optimistic: JournalGrade = current
        ? { ...current, value, comment, isPending: true }
        : {
            id: createTempId(),
            studentId: student.id,
            lessonId: lesson.id,
            teacherId: user.id,
            value,
            comment,
            type: journalType,
            createdAt: now,
            updatedAt: now,
            student: {
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              avatar: student.avatar,
            },
            lesson: { id: lesson.id, title: lesson.title, date: lesson.date },
            teacher: { id: user.id, firstName: user.firstName, lastName: user.lastName },
            isPending: true,
          };

      setGrades((list) =>
        current ? replaceById(list, current.id, optimistic) : [...list, optimistic]
      );

      try {
        const saved = current
          ? await apiUpdateGrade(current.id, { value, comment })
          : await apiCreateGrade({
              studentId: student.id,
              lessonId: lesson.id,
              value,
              comment,
              type: optimistic.type,
            });
        setGrades((list) => replaceById(list, optimistic.id, saved));
      } catch (error) {
        // Відкочуємо лише цю клітинку: інші оцінки могли змінитися, поки йшов запит
        setGrades((list) =>
          current ? replaceById(list, optimistic.id, current) : removeById(list, optimistic.id)
        );
        toastApiError(error, 'Не вдалося зберегти оцінку');
      }
    },
    [user, journalType]
  );

  // «Скасувати» в toast замість діалогу підтвердження: видалення — часта дрібна дія,
  // а відновлення — це звичайне створення тієї ж оцінки (тип, значення, коментар)
  const restoreGrade = useCallback(async (grade: JournalGrade) => {
    const pending: JournalGrade = { ...grade, id: createTempId(), isPending: true };
    setGrades((list) => [...list, pending]);
    try {
      const saved = await apiCreateGrade({
        studentId: grade.studentId,
        lessonId: grade.lessonId,
        value: grade.value,
        comment: grade.comment ?? '',
        type: grade.type,
      });
      setGrades((list) => replaceById(list, pending.id, saved));
      toast.success('Оцінку відновлено');
    } catch (error) {
      setGrades((list) => removeById(list, pending.id));
      toastApiError(error, 'Не вдалося відновити оцінку');
    }
  }, []);

  const handleDeleteGrade = useCallback(
    async (grade: JournalGrade) => {
      setGrades((list) => removeById(list, grade.id));
      try {
        await apiDeleteGrade(grade.id);
        toast.success(`Оцінку ${grade.value} видалено`, {
          action: { label: 'Скасувати', onClick: () => void restoreGrade(grade) },
        });
      } catch (error) {
        setGrades((list) => [...list, grade]);
        toastApiError(error, 'Не вдалося видалити оцінку');
      }
    },
    [restoreGrade]
  );

  const handleBulkSubmit = async (data: IBulkGradeDto) => {
    setIsSubmitting(true);
    try {
      const saved = await apiSaveBulkGrades(data);
      // Бекенд повертає збережені оцінки — вливаємо їх у журнал замість повного
      // перезапиту. Інший тип, ніж у фільтрі, у поточний вид не потрапляє
      const visible = gradeType ? saved.filter((grade) => grade.type === gradeType) : saved;
      setGrades((list) => upsertById(list, visible));
      toast.success('Оцінки збережено');
      setIsBulkOpen(false);
    } catch (error) {
      toastApiError(error, 'Не вдалося зберегти оцінки');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Колонки журналу — проведені й заплановані заняття обраного місяця
  const activeLessons = useMemo(() => journalLessons(lessons), [lessons]);
  const months = useMemo(() => journalMonths(activeLessons), [activeLessons]);
  const effectivePeriod =
    period && (period === ALL_PERIODS || months.some((month) => month.key === period))
      ? period
      : defaultPeriod(months);
  const visibleLessons = useMemo(
    () => lessonsInPeriod(activeLessons, effectivePeriod),
    [activeLessons, effectivePeriod]
  );

  const changeGroup = (next: string) => {
    setGroupId(next);
    setPeriod(null);
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
        icon={BookOpenCheck}
        title="Ви ще не закріплені за жодною групою"
        description="Журнал з'явиться, щойно адміністратор призначить вас викладачем групи."
      />
    ) : (
      <EmptyState
        icon={BookOpenCheck}
        title="Груп ще немає"
        description="Журнал ведеться для навчальної групи — спершу створіть її."
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
          <Badge variant="secondary">
            {GRADE_TYPE_META[journalType].label} · {students.length}{' '}
            {pluralize(students.length, ['студент', 'студенти', 'студентів'])}
          </Badge>

          {canEdit && (
            // Неактивна кнопка не показує підказку сама (pointer-events: none) — її несе обгортка
            <span
              title={
                groupId && activeLessons.length === 0
                  ? 'Масово оцінки ставляться за заняття — у групи їх ще немає'
                  : undefined
              }
            >
              <Button
                className="flex items-center gap-2 bg-[#C10000] hover:bg-[#A00000] text-white"
                onClick={() => {
                  setBulkKey((key) => key + 1);
                  setIsBulkOpen(true);
                }}
                disabled={!groupId || activeLessons.length === 0}
              >
                <Plus className="h-4 w-4" /> Виставити масово
              </Button>
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        {!isStudent && (
          <Label htmlFor="grades-group" className="sr-only">
            Група
          </Label>
        )}
        {!isStudent && (
          <Select value={groupId} onValueChange={changeGroup}>
            <SelectTrigger
              id="grades-group"
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
        )}

        <Label htmlFor="grades-type" className="sr-only">
          Тип оцінок
        </Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="grades-type" className="w-full sm:w-56 h-11 bg-white border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {isStudent && <SelectItem value={ALL_TYPES}>Усі типи</SelectItem>}
            {Object.entries(GRADE_TYPE_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!isStudent && months.length > 0 && (
          <>
            <Label htmlFor="grades-period" className="sr-only">
              Період
            </Label>
            <Select value={effectivePeriod} onValueChange={setPeriod}>
              <SelectTrigger
                id="grades-period"
                className="w-full sm:w-48 h-11 bg-white border-slate-200"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PERIODS}>Увесь курс</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.key} value={month.key}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {!isStudent && !journalError && <GradeLegend />}

      {journalError ? (
        <ErrorState
          title="Не вдалося завантажити журнал"
          description={journalError}
          onRetry={() => setJournalAttempt((value) => value + 1)}
        />
      ) : isStudent ? (
        <StudentGrades grades={grades} isLoading={isLoading} />
      ) : (
        <GradeJournal
          students={students}
          lessons={visibleLessons}
          grades={grades}
          isLoading={isLoading}
          canEdit={canEdit}
          typeLabel={GRADE_TYPE_META[journalType].label}
          onSaveGrade={handleSaveGrade}
          // DELETE /grades/:id дозволений лише адміну: викладач оцінку виправляє, а не видаляє
          onDeleteGrade={isAdmin ? handleDeleteGrade : undefined}
        />
      )}

      <BulkGradeForm
        key={bulkKey}
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        lessons={activeLessons}
        students={students}
        initialType={journalType}
        isSubmitting={isSubmitting}
        onSubmit={handleBulkSubmit}
      />
    </div>
  );
}
