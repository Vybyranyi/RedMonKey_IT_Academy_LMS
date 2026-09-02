import { CalendarDays, Clock3, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import {
  AttendanceStatus,
  LessonStatus,
  UserRole,
  type IPopulatedLesson,
} from "@redmonkey/shared";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  apiCompleteLesson,
  apiGetAttendance,
  apiSaveBulkAttendance,
} from "@/api/attendance";
import { apiGetUsers } from "@/api/users";
import type { IUserWithStats } from "@/types/userStats";
import { LESSON_TYPE_META } from "@/lib/lessonTypes";
import { useAuthStore } from "@/store/authStore";
import { getApiErrorMessage } from "@/utils/apiError";
import { toast } from "sonner";
import AttendanceList from "./AttendanceList";

interface LessonDetailsModalProps {
  lesson: IPopulatedLesson | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const statusMeta: Record<LessonStatus, { label: string; className: string }> = {
  [LessonStatus.SCHEDULED]: {
    label: "Заплановано",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  [LessonStatus.COMPLETED]: {
    label: "Проведено",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  [LessonStatus.CANCELLED]: {
    label: "Скасовано",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};// Можливо це краще в окремий файл винести

export default function LessonDetailsModal({
  lesson,
  isOpen,
  onClose,
  onSaved,
}: LessonDetailsModalProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [students, setStudents] = useState<IUserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || !lesson || !isAuthenticated || !user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [groupStudents, saved] = await Promise.all([
          apiGetUsers({ role: UserRole.STUDENT, groupId: lesson.groupId }),
          apiGetAttendance({ lessonId: lesson.id }),
        ]);

        setStudents(groupStudents);

        // Хто вже відмічений — бере збережений статус, решта дефолтом present
        const initial: Record<string, AttendanceStatus> = {};
        const initialNotes: Record<string, string> = {};
        groupStudents.forEach((student) => {
          const record = saved.find((item) => item.studentId === student.id);
          initial[student.id] = record?.status ?? AttendanceStatus.PRESENT;
          initialNotes[student.id] = record?.note ?? "";
        });
        setAttendance(initial);
        setNotes(initialNotes);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, "Не вдалося завантажити дані заняття"),
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isOpen, lesson, user]);//я попросив його перевіряти аунтетифікацю 

  if (!lesson) return null;

  const canManage =
    user?.role === UserRole.ADMIN ||
    (user?.role === UserRole.TEACHER && user.id === lesson.teacherId);
  const typeMeta = LESSON_TYPE_META[lesson.type];
  const currentStatus = statusMeta[lesson.status];
  const canComplete =
    lesson.status !== LessonStatus.COMPLETED &&
    lesson.status !== LessonStatus.CANCELLED;
  const records = Object.entries(attendance).map(([studentId, status]) => ({
    studentId,
    status,
    note: notes[studentId] ?? "",
  }));

  const saveAttendance = async (complete: boolean) => {
    setIsSaving(true);
    try {
      if (complete) {
        await apiCompleteLesson(lesson.id, records);
      } else {
        await apiSaveBulkAttendance({ lessonId: lesson.id, records });
      }
      toast.success(
        complete ? "Заняття позначено проведеним" : "Явку збережено",
      );
      onSaved();
      onClose();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Не вдалося зберегти дані заняття"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[680px] p-0 overflow-hidden bg-slate-50"
        closeButtonClassName="text-white hover:bg-white/10 hover:text-white"
      >
        <DialogHeader className="bg-[#1A2645] px-6 pt-6 pb-5 text-white">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <Badge className={`${typeMeta.event} border-0 font-semibold`}>
              {typeMeta.label}
            </Badge>
            <Badge className={`${currentStatus.className} font-semibold`}>
              {currentStatus.label}
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-white">
            {lesson.title}
          </DialogTitle>
          <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {format(new Date(lesson.date), "d MMMM yyyy, HH:mm", {
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
        </DialogHeader>

        <div className="max-h-[58vh] overflow-y-auto px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Відвідуваність</h3>
            <span className="text-sm text-slate-500">
              {students.length} студентів
            </span>
          </div>
          {isLoading ? (
            <div className="space-y-3" aria-label="Завантаження">
              {[1, 2, 3].map((item) => (//Може це можна по іншому зробити, а то як костиль виглядає
                <Skeleton key={item} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              У групі немає студентів
            </div>
          ) : (
            <div className="space-y-4">
              <AttendanceList
                students={students}
                value={attendance}
                onChange={(studentId, status) =>
                  setAttendance((current) => ({
                    ...current,
                    [studentId]: status,
                  }))
                }
                readOnly={!canManage || isSaving}
              />
              <div className="space-y-2">
                {students.map((student) => (
                  <input
                    key={student.id}
                    aria-label={`Нотатка для ${student.firstName} ${student.lastName}`}
                    value={notes[student.id] ?? ""}
                    disabled={!canManage || isSaving}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [student.id]: event.target.value,
                      }))
                    }
                    placeholder={`Нотатка: ${student.firstName} ${student.lastName}`}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#BA0000] focus:ring-2 focus:ring-[#BA0000]/20"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {canManage && (
          <DialogFooter className="!mx-0 !mb-0 bg-white pr-6 pb-6">
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => void saveAttendance(false)}
            >
              {isSaving ? "Збереження..." : "Зберегти явку"}
            </Button>
            {canComplete && (
              <Button
                disabled={isSaving}
                onClick={() => void saveAttendance(true)}
              >
                {isSaving ? "Збереження..." : "Позначити проведеним"}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
