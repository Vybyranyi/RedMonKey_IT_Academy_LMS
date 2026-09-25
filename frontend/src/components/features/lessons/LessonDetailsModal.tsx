import { CalendarDays, Clock3, UserRound } from 'lucide-react';
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
import { apiGetUsers } from '@/api/users';
import { LESSON_STATUS_META } from '@/lib/lessonStatuses';
import { LESSON_TYPE_META } from '@/lib/lessonTypes';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage, isSilentError, toastApiError } from '@/utils/apiError';
import { toast } from 'sonner';
import ErrorState from '@/components/common/ErrorState';
import AttendanceList from './AttendanceList';

interface LessonDetailsModalProps {
  lesson: IPopulatedLesson | null;
  isOpen: boolean;
  onClose: () => void;
  /** Заняття стало проведеним — сторінка оновлює саме його, без перезапиту розкладу */
  onLessonUpdated: (lesson: IPopulatedLesson) => void;
}

export default function LessonDetailsModal({
  lesson,
  isOpen,
  onClose,
  onLessonUpdated,
}: LessonDetailsModalProps) {
  const { user } = useAuthStore();
  const [students, setStudents] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

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

        // Хто вже відмічений — бере збережений статус, решта дефолтом present
        const initial: Record<string, AttendanceStatus> = {};
        const initialNotes: Record<string, string> = {};
        groupStudents.forEach((student) => {
          const record = saved.find((item) => item.studentId === student.id);
          initial[student.id] = record?.status ?? AttendanceStatus.PRESENT;
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
  const typeMeta = LESSON_TYPE_META[lesson.type];
  const statusMeta = LESSON_STATUS_META[lesson.status];
  const canComplete =
    lesson.status !== LessonStatus.COMPLETED && lesson.status !== LessonStatus.CANCELLED;
  const records = Object.entries(attendance).map(([studentId, status]) => ({
    studentId,
    status,
    note: notes[studentId] ?? '',
  }));

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
      onClose();
    } catch (error) {
      toastApiError(error, 'Не вдалося зберегти дані заняття');
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
          <div className="bg-[#1A2645] rounded-2xl p-6 text-white shadow-sm mt-2">
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
                <UserRound className="h-4 w-4" />
                Група: {lesson.group.name}
              </span>
              <span className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Викладач: {lesson.teacher.firstName} {lesson.teacher.lastName}
              </span>
            </div>
          </div>

          <div className="mt-6 mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Відвідуваність</h3>
            <span className="text-sm text-slate-500">{students.length} студентів</span>
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
              readOnly={!canManage || isSaving}
            />
          )}
        </div>

        {canManage && (
          <DialogFooter className="bg-white px-6 pb-6">
            <Button
              variant="outline"
              disabled={isSaving || isLoading || Boolean(loadError)}
              onClick={() => void saveAttendance(false)}
            >
              {isSaving ? 'Збереження...' : 'Зберегти явку'}
            </Button>
            {canComplete && (
              <Button
                className="bg-[#C10000] hover:bg-[#A00000] text-white"
                disabled={isSaving || isLoading || Boolean(loadError)}
                onClick={() => void saveAttendance(true)}
              >
                {isSaving ? 'Збереження...' : 'Позначити проведеним'}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
