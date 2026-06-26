import { useEffect, useState, useCallback } from 'react';
import { apiGetUsers, apiCreateUser } from '@/api/users';
import { apiGetGroups } from '@/api/groups';
import { UserRole, type IUser, type IUserDto } from '@redmonkey/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import UserFilters from '@/components/features/users/UserFilters';
import StudentTable from '@/components/features/users/StudentTable';
import UserForm from '@/components/features/users/UserForm';
import { useAuthStore } from '@/store/authStore';
import { Plus } from 'lucide-react';

export default function StudentsPage() {
  const { user: currentUser } = useAuthStore();
  const [students, setStudents] = useState<IUser[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      const data = await apiGetUsers({
        role: UserRole.STUDENT,
        groupId: selectedGroup,
        q: search
      });
      setStudents(data);
    } catch (error) {
      console.error('Помилка завантаження студентів:', error);
    }
  }, [search, selectedGroup]);

  const fetchGroups = useCallback(async () => {
    try {
      const data = await apiGetGroups();
      setGroups(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateStudent = async (values: IUserDto) => {
    setIsSubmitLoading(true);
    try {
      await apiCreateUser({ ...values, role: UserRole.STUDENT });
      setIsCreateOpen(false);
      fetchStudents();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    console.log('Перегляд профілю студента з ID:', id);
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Студенти</h1>
            <Badge variant="secondary" className="mt-1">
              {students.filter(s => s.isActive).length} активних - {students.length} всього
            </Badge>
          </div>
          <p className="text-slate-500">Управління обліковими записами студентів та моніторинг успішності</p>
        </div>

        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#C10000] hover:bg-[#A00000] text-white rounded-md h-11 font-medium shadow-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Додати студента
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Створення картки студента</DialogTitle>
              </DialogHeader>
              <UserForm onSubmit={handleCreateStudent} isSubmitting={isSubmitLoading} hideRoleSelect />
            </DialogContent>
          </Dialog>
        )}
      </div>

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
      />
    </div>
  );
}
