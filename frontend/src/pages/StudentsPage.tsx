import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiGetUsers, apiCreateUser, apiUpdateUser } from '@/api/users';
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
import EmptyState from '@/components/common/EmptyState';
import ErrorState from '@/components/common/ErrorState';
import UserFilters from '@/components/features/users/UserFilters';
import StudentTable from '@/components/features/users/StudentTable';
import UserForm from '@/components/features/users/UserForm';
import StudentDetailsModal from '@/components/features/users/StudentDetailsModal';
import { useAuthStore } from '@/store/authStore';
import { Plus, SearchX, Users } from 'lucide-react';

const groupIdOf = (user: IUser) =>
  user.group && typeof user.group === 'object' ? user.group.id : user.group || '';

export default function StudentsPage() {
  const { user: currentUser } = useAuthStore();
  const [students, setStudents] = useState<IUser[]>([]);
  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // Скелетон — лише для першого завантаження. Далі при зміні фільтрів лишаємо
  // попередній список (приглушеним), щоб таблиця не блимала на кожну літеру пошуку
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<IUser | null>(null);
  const [editingStudent, setEditingStudent] = useState<IUser | null>(null);

  useEffect(() => {
    // Кожна літера в пошуку — новий запит. Попередній скасовуємо: інакше
    // повільна відповідь на «ан» могла б прийти після «анна» і перезаписати список
    const controller = new AbortController();
    const { signal } = controller;

    const loadStudents = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await apiGetUsers(
          { role: UserRole.STUDENT, groupId: selectedGroup, q: search },
          { signal }
        );
        if (signal.aborted) return;
        setStudents(data);
        setHasLoaded(true);
      } catch (error) {
        if (!signal.aborted && !isSilentError(error)) {
          setLoadError(getApiErrorMessage(error, 'Не вдалося завантажити студентів'));
        }
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    };

    loadStudents();

    return () => controller.abort();
  }, [search, selectedGroup, loadAttempt]);

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      try {
        const data = await apiGetGroups();
        if (!cancelled) setGroups(data);
      } catch (error) {
        if (!cancelled) toastApiError(error, 'Не вдалося завантажити групи для фільтра');
      }
    };

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  // Та сама умова, що на бекенді (GET /users?groupId=&q=): створений чи змінений
  // студент лишається в списку, лише якщо підходить під поточні фільтри
  const matchesFilters = (student: IUser) => {
    if (selectedGroup && groupIdOf(student) !== selectedGroup) return false;
    const term = search.toLowerCase();
    return (
      !term ||
      [student.firstName, student.lastName, student.email].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  };

  const handleCreateStudent = async (values: IUserDto) => {
    setIsSubmitLoading(true);
    try {
      const created = await apiCreateUser({ ...values, role: UserRole.STUDENT });
      setIsCreateOpen(false);
      // Замість перезапиту — відповідь сервера на початок (список від нових до старих)
      if (matchesFilters(created)) setStudents((current) => [created, ...current]);
      toast.success(`Студента ${created.firstName} ${created.lastName} додано`);
    } catch (error) {
      toastApiError(error, 'Не вдалося створити студента');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleUpdateStudent = async (values: IUserDto) => {
    if (!editingStudent) return;
    setIsSubmitLoading(true);
    try {
      const updated = await apiUpdateUser(editingStudent.id, values);
      setEditingStudent(null);
      // Точково: один рядок за id, решта таблиці не перемальовується
      setStudents((current) =>
        matchesFilters(updated)
          ? current.map((student) =>
              student.id === updated.id ? { ...student, ...updated } : student
            )
          : current.filter((student) => student.id !== updated.id)
      );
      toast.success('Зміни збережено');
    } catch (error) {
      toastApiError(error, 'Не вдалося зберегти зміни');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    const student = students.find((s) => s.id === id);
    if (student) {
      setSelectedStudent(student);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedGroup('');
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const hasFilters = Boolean(search || selectedGroup);

  const renderList = () => {
    if (loadError) {
      return (
        <ErrorState
          title="Не вдалося завантажити студентів"
          description={loadError}
          onRetry={() => setLoadAttempt((value) => value + 1)}
        />
      );
    }

    if (!hasLoaded) {
      return (
        <div className="space-y-2" aria-busy="true" aria-label="Завантаження студентів">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    if (students.length === 0 && !isLoading) {
      return hasFilters ? (
        <EmptyState
          icon={SearchX}
          title="Нікого не знайдено"
          description="Спробуйте інший запит або оберіть іншу групу."
        >
          <Button variant="outline" onClick={resetFilters}>
            Скинути фільтри
          </Button>
        </EmptyState>
      ) : (
        <EmptyState
          icon={Users}
          title="Студентів ще немає"
          description={
            isAdmin
              ? 'Додайте першого студента — і його можна буде записати в групу.'
              : 'У ваших групах поки немає студентів.'
          }
        >
          {isAdmin && (
            <Button
              className="bg-[#C10000] hover:bg-[#A00000] text-white"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4" /> Додати студента
            </Button>
          )}
        </EmptyState>
      );
    }

    return (
      <div aria-busy={isLoading} className={`transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
        <StudentTable
          students={students}
          onViewDetails={handleViewDetails}
          onEdit={isAdmin ? setEditingStudent : undefined}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        {hasLoaded ? (
          <Badge variant="secondary">
            {students.filter((s) => s.isActive).length} активних - {students.length} всього
          </Badge>
        ) : (
          <Skeleton className="h-6 w-40" />
        )}

        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#C10000] hover:bg-[#A00000] text-white rounded-md h-11 font-medium shadow-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Додати студента
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-xl">Створення картки студента</DialogTitle>
              </DialogHeader>
              <UserForm
                onSubmit={handleCreateStudent}
                isSubmitting={isSubmitLoading}
                hideRoleSelect
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isAdmin && (
        <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Редагування картки студента</DialogTitle>
            </DialogHeader>
            {editingStudent && (
              <UserForm
                initialValues={{
                  firstName: editingStudent.firstName,
                  lastName: editingStudent.lastName,
                  email: editingStudent.email,
                  phone: editingStudent.phone || '',
                  role: editingStudent.role,
                  group: groupIdOf(editingStudent),
                }}
                onSubmit={handleUpdateStudent}
                isSubmitting={isSubmitLoading}
                hideRoleSelect
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <UserFilters
        search={search}
        onSearchChange={setSearch}
        selectedGroup={selectedGroup}
        onGroupChange={setSelectedGroup}
        groups={groups}
      />

      {renderList()}

      <StudentDetailsModal
        student={selectedStudent}
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
}
