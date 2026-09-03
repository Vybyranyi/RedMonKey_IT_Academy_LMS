import { useEffect, useState } from 'react';
import { apiGetUsers, apiCreateUser, apiUpdateUser } from '@/api/users';
import { apiGetGroups } from '@/api/groups';
import { UserRole, type IPopulatedGroup, type IUser, type IUserDto } from '@redmonkey/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import UserFilters from '@/components/features/users/UserFilters';
import StudentTable from '@/components/features/users/StudentTable';
import UserForm from '@/components/features/users/UserForm';
import StudentDetailsModal from '@/components/features/users/StudentDetailsModal';
import { useAuthStore } from '@/store/authStore';
import { Plus } from 'lucide-react';

export default function StudentsPage() {
  const { user: currentUser } = useAuthStore();
  const [students, setStudents] = useState<IUser[]>([]);
  const [groups, setGroups] = useState<IPopulatedGroup[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<IUser | null>(null);
  const [editingStudent, setEditingStudent] = useState<IUser | null>(null);

  // Лічильник перезавантаження: після створення/редагування студента
  // збільшуємо його, і ефект перечитує список. Так запит живе в одному місці,
  // а setState не викликається з ефекту синхронно.
  const [reloadKey, setReloadKey] = useState(0);
  const reloadStudents = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;

    const loadStudents = async () => {
      try {
        const data = await apiGetUsers({
          role: UserRole.STUDENT,
          groupId: selectedGroup,
          q: search
        });
        if (!cancelled) setStudents(data);
      } catch (error) {
        console.error('Помилка завантаження студентів:', error);
      }
    };

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [search, selectedGroup, reloadKey]);

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      try {
        const data = await apiGetGroups();
        if (!cancelled) setGroups(data);
      } catch (error) {
        console.error(error);
      }
    };

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateStudent = async (values: IUserDto) => {
    setIsSubmitLoading(true);
    try {
      await apiCreateUser({ ...values, role: UserRole.STUDENT });
      setIsCreateOpen(false);
      reloadStudents();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleUpdateStudent = async (values: IUserDto) => {
    if (!editingStudent) return;
    setIsSubmitLoading(true);
    try {
      await apiUpdateUser(editingStudent.id, values);
      setEditingStudent(null);
      reloadStudents();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    const student = students.find(s => s.id === id);
    if (student) {
      setSelectedStudent(student);
    }
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          {students.filter(s => s.isActive).length} активних - {students.length} всього
        </Badge>

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
              <UserForm onSubmit={handleCreateStudent} isSubmitting={isSubmitLoading} hideRoleSelect />
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
                  group: editingStudent.group && typeof editingStudent.group === 'object' ? editingStudent.group.id : editingStudent.group || ''
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

      <StudentTable
        students={students}
        onViewDetails={handleViewDetails}
        onEdit={isAdmin ? setEditingStudent : undefined}
      />

      <StudentDetailsModal 
        student={selectedStudent} 
        isOpen={!!selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
      />
    </div>
  );
}
