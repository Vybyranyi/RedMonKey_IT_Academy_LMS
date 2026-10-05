import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiGetUsers, apiCreateUser, apiUpdateUser, apiDeleteUser } from '@/api/users';
import { apiGetGroups } from '@/api/groups';
import { UserRole, type IPopulatedGroup, type IUser, type IUserDto } from '@redmonkey/shared';
import { getApiErrorMessage, isSilentError, toastApiError } from '@/utils/apiError';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import TeacherCard from '@/components/features/users/TeacherCard';
import UserForm from '@/components/features/users/UserForm';
import TeacherDetailsModal from '@/components/features/users/TeacherDetailsModal';
import { useAuthStore } from '@/store/authStore';
import { EMPTY_TEACHER_SUMMARY, summarizeTeacherGroups } from '@/lib/teacherGroups';
import { pluralize } from '@/utils/stringUtils';
import { GraduationCap, Plus } from 'lucide-react';

export default function TeachersPage() {
  const { user: currentUser } = useAuthStore();
  const [teachers, setTeachers] = useState<IUser[]>([]);
  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<IUser | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<IUser | null>(null);
  const [deactivatingTeacher, setDeactivatingTeacher] = useState<IUser | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // «Спробувати знову» після помилки: ефект перечитує список. Після створення
  // чи редагування список не перечитуємо — оновлюємо один запис з відповіді сервера
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const loadTeachers = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        // Групи й кількість студентів викладача /users не віддає — рахуємо зі складу груп
        const [teacherList, groupList] = await Promise.all([
          apiGetUsers({ role: UserRole.TEACHER }, { signal }),
          apiGetGroups(),
        ]);
        if (signal.aborted) return;
        setTeachers(teacherList);
        setGroups(groupList);
      } catch (error) {
        if (!signal.aborted && !isSilentError(error)) {
          setLoadError(getApiErrorMessage(error, 'Не вдалося завантажити викладачів'));
        }
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    };

    loadTeachers();

    return () => controller.abort();
  }, [loadAttempt]);

  const handleCreateTeacher = async (values: IUserDto) => {
    setIsSubmitLoading(true);
    try {
      const created = await apiCreateUser({ ...values, role: UserRole.TEACHER });
      setIsCreateOpen(false);
      setTeachers((current) => [created, ...current]);
      toast.success(`Викладача ${created.firstName} ${created.lastName} додано`);
    } catch (error) {
      toastApiError(error, 'Не вдалося створити викладача');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleUpdateTeacher = async (values: IUserDto) => {
    if (!editingTeacher) return;
    setIsSubmitLoading(true);
    try {
      const updated = await apiUpdateUser(editingTeacher.id, values);
      setEditingTeacher(null);
      setTeachers((current) =>
        current.map((teacher) => (teacher.id === updated.id ? { ...teacher, ...updated } : teacher))
      );
      toast.success('Зміни збережено');
    } catch (error) {
      toastApiError(error, 'Не вдалося зберегти зміни');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // DELETE /users/:id не видаляє, а деактивує: викладач більше не входить у систему
  // і зникає зі списку (GET /users віддає лише активних)
  const handleDeactivateTeacher = async () => {
    if (!deactivatingTeacher) return;
    setIsDeactivating(true);
    try {
      await apiDeleteUser(deactivatingTeacher.id);
      setTeachers((current) => current.filter((teacher) => teacher.id !== deactivatingTeacher.id));
      toast.success(
        `Викладача ${deactivatingTeacher.firstName} ${deactivatingTeacher.lastName} деактивовано`
      );
      setDeactivatingTeacher(null);
    } catch (error) {
      toastApiError(error, 'Не вдалося деактивувати викладача');
    } finally {
      setIsDeactivating(false);
    }
  };

  const summaries = useMemo(() => summarizeTeacherGroups(groups), [groups]);
  const summaryOf = (teacherId: string) => summaries.get(teacherId) ?? EMPTY_TEACHER_SUMMARY;

  const handleViewDetails = (id: string) => {
    const teacher = teachers.find((t) => t.id === id);
    if (teacher) {
      setSelectedTeacher(teacher);
    }
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  if (loadError) {
    return (
      <ErrorState
        title="Не вдалося завантажити викладачів"
        description={loadError}
        onRetry={() => setLoadAttempt((value) => value + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        {isLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <Badge variant="secondary">
            {teachers.length} {pluralize(teachers.length, ['викладач', 'викладачі', 'викладачів'])}
          </Badge>
        )}

        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                variant="brand"
                className="rounded-md h-11 font-medium shadow-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Додати викладача
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-xl">Створення картки викладача</DialogTitle>
              </DialogHeader>
              <UserForm
                onSubmit={handleCreateTeacher}
                isSubmitting={isSubmitLoading}
                hideRoleSelect
                initialValues={{
                  firstName: '',
                  lastName: '',
                  email: '',
                  role: UserRole.TEACHER,
                  phone: '',
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isAdmin && (
        <Dialog open={!!editingTeacher} onOpenChange={(open) => !open && setEditingTeacher(null)}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Редагування картки викладача</DialogTitle>
            </DialogHeader>
            {editingTeacher && (
              <UserForm
                initialValues={{
                  firstName: editingTeacher.firstName,
                  lastName: editingTeacher.lastName,
                  email: editingTeacher.email,
                  phone: editingTeacher.phone || '',
                  role: editingTeacher.role,
                  group:
                    editingTeacher.group && typeof editingTeacher.group === 'object'
                      ? editingTeacher.group.id
                      : editingTeacher.group || '',
                }}
                onSubmit={handleUpdateTeacher}
                isEdit
                isSubmitting={isSubmitLoading}
                hideRoleSelect
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      {isLoading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-busy="true"
          aria-label="Завантаження викладачів"
        >
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Викладачів ще немає"
          description="Додайте викладача — після цього його можна призначити групі й ставити заняття."
        >
          {isAdmin && (
            <Button
              variant="brand"

              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4" /> Додати викладача
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              summary={summaryOf(teacher.id)}
              onViewDetails={handleViewDetails}
              onEdit={isAdmin ? setEditingTeacher : undefined}
              onDeactivate={isAdmin ? setDeactivatingTeacher : undefined}
            />
          ))}
        </div>
      )}

      <TeacherDetailsModal
        teacher={selectedTeacher}
        summary={selectedTeacher ? summaryOf(selectedTeacher.id) : EMPTY_TEACHER_SUMMARY}
        isOpen={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
      />

      <ConfirmDialog
        open={!!deactivatingTeacher}
        onOpenChange={(open) => !open && setDeactivatingTeacher(null)}
        title="Деактивувати викладача?"
        description={
          deactivatingTeacher && (
            <>
              {deactivatingTeacher.firstName} {deactivatingTeacher.lastName} більше не зможе увійти
              в систему і зникне зі списку викладачів. Його заняття й виставлені оцінки лишаться в
              історії.
            </>
          )
        }
        confirmLabel="Деактивувати"
        isPending={isDeactivating}
        onConfirm={() => void handleDeactivateTeacher()}
      />
    </div>
  );
}
