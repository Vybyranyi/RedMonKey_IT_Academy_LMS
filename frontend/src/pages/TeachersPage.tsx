import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGetUsers, apiCreateUser, apiUpdateUser } from '@/api/users';
import { UserRole, type IUser, type IUserDto } from '@redmonkey/shared';
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
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import TeacherCard from '@/components/features/users/TeacherCard';
import UserForm from '@/components/features/users/UserForm';
import TeacherDetailsModal from '@/components/features/users/TeacherDetailsModal';
import { useAuthStore } from '@/store/authStore';
import { GraduationCap, Plus } from 'lucide-react';

export default function TeachersPage() {
  const { user: currentUser } = useAuthStore();
  const [teachers, setTeachers] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<IUser | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<IUser | null>(null);

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
        const data = await apiGetUsers({ role: UserRole.TEACHER }, { signal });
        if (!signal.aborted) setTeachers(data);
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
          <Badge variant="secondary">{teachers.length} всього</Badge>
        )}

        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#C10000] hover:bg-[#A00000] text-white rounded-md h-11 font-medium shadow-sm flex items-center gap-2">
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
            <Skeleton key={n} className="h-72 w-full rounded-[20px]" />
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
              className="bg-[#C10000] hover:bg-[#A00000] text-white"
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
              onViewDetails={handleViewDetails}
              onEdit={isAdmin ? setEditingTeacher : undefined}
            />
          ))}
        </div>
      )}

      <TeacherDetailsModal
        teacher={selectedTeacher}
        isOpen={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
      />
    </div>
  );
}
