import { BookOpenText, CalendarDays, Clock3, Pencil, UserRound, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import {
  AttendanceStatus,
  LessonStatus,
  UserRole,
  type IPopulatedLesson,
  type IUser,
} from '@redmonkey/shared';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiCompleteLesson, apiGetAttendance, apiSaveBulkAttendance } from '@/api/attendance';
import { apiCancelLesson } from '@/api/lessons';
import { apiGetUsers } from '@/api/users';
import { ATTENDANCE_STATUS_META } from '@/lib/attendanceStatuses';
import { LESSON_STATUS_META } from '@/lib/lessonStatuses';
import { LESSON_TYPE_META } from '@/lib/lessonTypes';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage, isSilentError, toastApiError } from '@/utils/apiError';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorState from '@/components/common/ErrorState';
import { pluralize } from '@/utils/stringUtils';
import AttendanceList from './AttendanceList';

interface LessonDetailsModalProps {
  lesson: IPopulatedLesson | null;
  isOpen: boolean;
  onClose: () => void;
  /** Заняття проведене чи скасоване — сторінка оновлює саме його, без перезапиту розкладу */
  onLessonUpdated: (lesson: IPopulatedLesson) => void;
  /** Редагування відкриває сторінка: форма заняття живе там само, де й створення */
  onEdit?: (lesson: IPopulatedLesson) => void;
}

type ConfirmAction = 'complete' | 'cancel' | null;

export default function LessonDetailsModal({
  lesson,
  isOpen,
  onClose,
  onLessonUpdated,
  onEdit,
}: LessonDetailsModalProps) {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    if (!isOpen || !lesson) return;
    // Закрили модалку чи відкрили інше заняття до відповіді — запит скасовується
    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [groupStudents, saved] = await Promise.all([
          apiGetUsers({ role: UserRole.STUDENT, groupId: lesson.groupId }, { signal }),
          apiGetAttendance({ lessonId: lesson.id }, { signal }),
        ]);

        if (signal.aborted) return;

        // Статус беремо лише зі збереженої явки. Раніше всі невідмічені стартували
        // «Присутніми», і проведення заняття мовчки записувало присутність тим,
        // кого викладач не перевіряв
        const initial: Record<string, AttendanceStatus> = {};
        const initialNotes: Record<string, string> = {};
        groupStudents.forEach((student) => {
          const record = saved.find((item) => item.studentId === student.id);
          if (record) initial[student.id] = record.status;
          initialNotes[student.id] = record?.note ?? '';
        });
        setStudents(groupStudents);
        setAttendance(initial);
        setNotes(initialNotes);
      } catch (error) {
        if (!signal.aborted && !isSilentError(error)) {
          setLoadError(getApiErrorMessage(error, 'Не вдалося завантажити дані заняття'));
        }
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [isOpen, lesson, loadAttempt]);

  // Стабільні колбеки + функціональний setState: перемикання статусу одного
  // студента перемальовує лише його рядок (AttendanceRow під memo)
  const handleStatusChange = useCallback((studentId: string, status: AttendanceStatus) => {
    setAttendance((current) => ({ ...current, [studentId]: status }));
  }, []);

  const handleNoteChange = useCallback((studentId: string, note: string) => {
    setNotes((current) => ({ ...current, [studentId]: note }));
  }, []);

  if (!lesson) return null;

  const canManage =
    user?.role === UserRole.ADMIN ||
    (user?.role === UserRole.TEACHER && user.id === lesson.teacherId);
  const isScheduled = lesson.status === LessonStatus.SCHEDULED;
  const isCancelled = lesson.status === LessonStatus.CANCELLED;
  // Скасоване заняття лишається в історії як є: явки й кнопок для нього немає
  const canEditAttendance = canManage && !isCancelled;
  const typeMeta = LESSON_TYPE_META[lesson.type];
  const statusMeta = LESSON_STATUS_META[lesson.status];

  const records = Object.entries(attendance).map(([studentId, status]) => ({
    studentId,
    status,
    note: notes[studentId] ?? '',
  }));
  const unmarkedCount = students.length - records.length;
  const countOf = (status: AttendanceStatus) =>
    records.filter((record) => record.status === status).length;
  const isBusy = isSaving || isLoading || Boolean(loadError);

  const markAllPresent = () => {
    setAttendance((current) => {
      const next = { ...current };
      students.forEach((student) => {
        next[student.id] ??= AttendanceStatus.PRESENT;
      });
      return next;
    });
  };

  const saveAttendance = async (complete: boolean) => {
    setIsSaving(true);
    try {
      if (complete) {
        onLessonUpdated(await apiCompleteLesson(lesson.id, records));
      } else {
        // Явка на календарі не видна — оновлювати розклад нема чого
        await apiSaveBulkAttendance({ lessonId: lesson.id, records });
      }
      toast.success(complete ? 'Заняття позначено проведеним' : 'Явку збережено');
      setConfirmAction(null);
      onClose();
    } catch (error) {
      toastApiError(error, 'Не вдалося зберегти дані заняття');
    } finally {
      setIsSaving(false);
    }
  };

  // DELETE /lessons/:id не видаляє заняття, а переводить у «Скасовано»: оцінки й
  // явка лишаються, а календар показує його перекресленим
  const cancelLesson = async () => {
    setIsSaving(true);
    try {
      onLessonUpdated(await apiCancelLesson(lesson.id));
      toast.success('Заняття скасовано');
      setConfirmAction(null);
      onClose();
    } catch (error) {
      toastApiError(error, 'Не вдалося скасувати заняття');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[680px] p-0 overflow-hidden bg-slate-50">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">{lesson.title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
          <div className="bg-title rounded-2xl p-6 text-white shadow-sm mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${typeMeta.event} border-0 font-semibold`}>{typeMeta.label}</Badge>
              <Badge className={`${statusMeta.badge} font-semibold`}>{statusMeta.label}</Badge>
            </div>
            <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2 mt-4">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {format(new Date(lesson.date), 'd MMMM yyyy, HH:mm', {
                  locale: uk,
                })}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {lesson.duration} хв
              </span>
              <span className="flex items-center gap-2">
                <UsersRound className="h-4 w-4" />
                Група: {lesson.group.name}
              </span>
              <span className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Викладач: {lesson.teacher.firstName} {lesson.teacher.lastName}
              </span>
            </div>
          </div>

          {(lesson.homeworkDescription || lesson.homeworkDueDate) && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <BookOpenText className="h-4 w-4 text-brand" aria-hidden="true" />
                Домашнє завдання
              </h3>
              {lesson.homeworkDescription && (
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">
                  {lesson.homeworkDescription}
                </p>
              )}
              {lesson.homeworkDueDate && (
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Здати до{' '}
                  {format(new Date(lesson.homeworkDueDate), 'd MMMM', {
                    locale: uk,
                  })}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">Відвідуваність</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                {students.length} {pluralize(students.length, ['студент', 'студенти', 'студентів'])}
                {canEditAttendance && unmarkedCount > 0 && ` · не відмічено ${unmarkedCount}`}
              </span>
              {canEditAttendance && unmarkedCount > 0 && !isBusy && (
                <Button variant="outline" size="sm" className="h-8" onClick={markAllPresent}>
                  Всі присутні
                </Button>
              )}
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3" aria-label="Завантаження">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : loadError ? (
            <ErrorState
              title="Не вдалося завантажити відвідуваність"
              description={loadError}
              onRetry={() => setLoadAttempt((value) => value + 1)}
              className="p-6 md:p-8"
            />
          ) : (
            <AttendanceList
              students={students}
              value={attendance}
              onChange={handleStatusChange}
              notes={notes}
              onNoteChange={handleNoteChange}
              readOnly={!canEditAttendance || isSaving}
            />
          )}
        </div>

        {canManage && !isCancelled && (
          <DialogFooter className="bg-white px-6 pb-6 sm:justify-between">
            {isScheduled ? (
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  variant="ghost"
                  className="text-slate-600 hover:bg-red-50 hover:text-brand"
                  disabled={isSaving}
                  onClick={() => setConfirmAction('cancel')}
                >
                  Скасувати заняття
                </Button>
                {onEdit && (
                  <Button variant="outline" disabled={isSaving} onClick={() => onEdit(lesson)}>
                    <Pencil className="h-4 w-4" /> Редагувати
                  </Button>
                )}
              </div>
            ) : (
              <span />
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="outline"
                disabled={isBusy || records.length === 0}
                onClick={() => void saveAttendance(false)}
              >
                {isSaving && confirmAction === null ? 'Збереження...' : 'Зберегти явку'}
              </Button>
              {isScheduled && (
                <Button
                  variant="brand"

                  // Провести можна, лише коли відмічено кожного: інакше в історії
                  // заняття лишились би студенти без жодної позначки
                  disabled={isBusy || unmarkedCount > 0}
                  title={
                    unmarkedCount > 0
                      ? 'Спершу відмітьте всіх студентів або натисніть «Всі присутні»'
                      : undefined
                  }
                  onClick={() => setConfirmAction('complete')}
                >
                  Позначити проведеним
                </Button>
              )}
            </div>
          </DialogFooter>
        )}

        <ConfirmDialog
          open={confirmAction === 'complete'}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title="Позначити заняття проведеним?"
          description={`«${lesson.title}», ${format(new Date(lesson.date), 'd MMMM, HH:mm', { locale: uk })}. Статус заняття зміниться на «Проведено», його вже не можна буде редагувати чи скасувати.`}
          confirmLabel="Позначити проведеним"
          isPending={isSaving}
          onConfirm={() => void saveAttendance(true)}
        >
          <ul className="grid grid-cols-2 gap-2 text-sm" aria-label="Підсумок явки">
            {Object.values(AttendanceStatus).map((status) => (
              <li
                key={status}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
              >
                <span className="text-slate-600">{ATTENDANCE_STATUS_META[status].label}</span>
                <span className="font-bold text-slate-900">{countOf(status)}</span>
              </li>
            ))}
          </ul>
        </ConfirmDialog>

        <ConfirmDialog
          open={confirmAction === 'cancel'}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title="Скасувати заняття?"
          description={`«${lesson.title}» для групи ${lesson.group.name} лишиться в розкладі зі статусом «Скасовано». Провести чи редагувати його після цього не вийде.`}
          confirmLabel="Скасувати заняття"
          cancelLabel="Не скасовувати"
          isPending={isSaving}
          onConfirm={() => void cancelLesson()}
        />
      </DialogContent>
    </Dialog>
  );
}
