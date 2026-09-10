import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { GradeType, UserRole } from '@redmonkey/shared';
import type {
  IBulkGradeDto,
  IGradeSummaryRow,
  IPopulatedGrade,
  IPopulatedGroup,
  IPopulatedLesson,
  IUser,
} from '@redmonkey/shared';
import { apiGetGroups } from '@/api/groups';
import { apiGetLessons } from '@/api/lessons';
import { apiGetUsers } from '@/api/users';
import {
  apiCreateGrade,
  apiDeleteGrade,
  apiGetGrades,
  apiGetGradesSummary,
  apiSaveBulkGrades,
  apiUpdateGrade,
} from '@/api/grades';
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
import { GRADE_TYPE_META } from '@/lib/gradeColors';
import BulkGradeForm from '@/components/features/grades/BulkGradeForm';
import GradeJournal from '@/components/features/grades/GradeJournal';
import StudentGrades from '@/components/features/grades/StudentGrades';

const ALL_TYPES = 'all';

export default function GradesPage() {
  const { user } = useAuthStore();

  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [type, setType] = useState<string>(ALL_TYPES);

  const [students, setStudents] = useState<IUser[]>([]);
  const [lessons, setLessons] = useState<IPopulatedLesson[]>([]);
  const [grades, setGrades] = useState<IPopulatedGrade[]>([]);
  const [summary, setSummary] = useState<IGradeSummaryRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingCell, setSavingCell] = useState<{ studentId: string; lessonId: string } | null>(
    null
  );
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  // Лічильник ремонтує форму на кожне відкриття, щоб вона не памʼятала
  // оцінки з попереднього заняття — і щоб обійтись без setState в ефекті
  const [bulkKey, setBulkKey] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const userId = user?.id;
  const isStudent = user?.role === UserRole.STUDENT;
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHER;
  const gradeType = type === ALL_TYPES ? undefined : (type as GradeType);

  // Студент дивиться лише свої оцінки — селектор групи йому не потрібен,
  // а бекенд усе одно звузить вибірку до нього
  useEffect(() => {
    if (!userId || isStudent) return;
    let cancelled = false;

    const loadGroups = async () => {
      try {
        const data = await apiGetGroups();
        if (cancelled) return;

        // GET /groups віддає всі групи академії без звуження за роллю. Якщо
        // не відфільтрувати, викладач авто-обере чужу групу і отримає 403.
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

    const loadJournal = async () => {
      setIsLoading(true);
      try {
        if (isStudent) {
          const data = await apiGetGrades({ type: gradeType });
          if (!cancelled) setGrades(data);
          return;
        }

        const [studentList, lessonList, gradeList, summaryList] = await Promise.all([
          apiGetUsers({ role: UserRole.STUDENT, groupId }),
          apiGetLessons({ groupId }),
          apiGetGrades({ groupId, type: gradeType }),
          apiGetGradesSummary({ groupId, type: gradeType }),
        ]);

        if (cancelled) return;
        setStudents(studentList);
        setLessons(lessonList);
        setGrades(gradeList);
        setSummary(summaryList);
      } catch (error) {
        if (!cancelled) toast.error(getApiErrorMessage(error, 'Не вдалося завантажити журнал'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadJournal();

    return () => {
      cancelled = true;
    };
  }, [userId, isStudent, groupId, gradeType, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  const handleSaveGrade = async (
    studentId: string,
    lessonId: string,
    value: number,
    comment: string
  ) => {
    const existing = grades.find(
      (grade) =>
        grade.studentId === studentId &&
        grade.lessonId === lessonId &&
        (gradeType ? grade.type === gradeType : true)
    );

    setSavingCell({ studentId, lessonId });
    try {
      if (existing) {
        await apiUpdateGrade(existing.id, { value, comment });
      } else {
        // Коли обрано «Усі типи», новій оцінці потрібен конкретний — беремо класну роботу
        await apiCreateGrade({
          studentId,
          lessonId,
          value,
          comment,
          type: gradeType ?? GradeType.CLASSWORK,
        });
      }
      toast.success('Оцінку збережено');
      reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося зберегти оцінку'));
    } finally {
      setSavingCell(null);
    }
  };

  const handleDeleteGrade = async (gradeId: string) => {
    try {
      await apiDeleteGrade(gradeId);
      toast.success('Оцінку видалено');
      reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося видалити оцінку'));
    }
  };

  const handleBulkSubmit = async (data: IBulkGradeDto) => {
    setIsSubmitting(true);
    try {
      await apiSaveBulkGrades(data);
      toast.success('Оцінки збережено');
      setIsBulkOpen(false);
      reload();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Не вдалося зберегти оцінки'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Заголовок і підзаголовок сторінки рендерить Header у AppLayout — тут лише лічильник і дія */}
      {!isStudent && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{students.length} студентів</Badge>

          {canEdit && (
            <Button
              className="flex items-center gap-2 bg-[#C10000] hover:bg-[#A00000] text-white"
              onClick={() => {
                setBulkKey((key) => key + 1);
                setIsBulkOpen(true);
              }}
              disabled={!groupId || lessons.length === 0}
            >
              <Plus className="h-4 w-4" /> Виставити масово
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        {!isStudent && (
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
        )}

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-56 h-11 bg-white border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>Усі типи</SelectItem>
            {Object.entries(GRADE_TYPE_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isStudent ? (
        <StudentGrades grades={grades} isLoading={isLoading} />
      ) : (
        <GradeJournal
          students={students}
          lessons={lessons}
          grades={grades}
          summary={summary}
          isLoading={isLoading}
          canEdit={canEdit}
          savingCell={savingCell}
          onSaveGrade={handleSaveGrade}
          onDeleteGrade={handleDeleteGrade}
        />
      )}

      <BulkGradeForm
        key={bulkKey}
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        lessons={lessons}
        students={students}
        isSubmitting={isSubmitting}
        onSubmit={handleBulkSubmit}
      />
    </div>
  );
}
