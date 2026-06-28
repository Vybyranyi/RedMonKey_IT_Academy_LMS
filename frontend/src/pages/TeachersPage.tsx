import { useEffect, useState, useCallback } from 'react';
import { apiGetUsers, apiCreateUser, apiUpdateUser } from '@/api/users';
import { UserRole, type IUser, type IUserDto } from '@redmonkey/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import TeacherCard from '@/components/features/users/TeacherCard';
import UserForm from '@/components/features/users/UserForm';
import TeacherDetailsModal from '@/components/features/users/TeacherDetailsModal';
import { useAuthStore } from '@/store/authStore';
import { Plus } from 'lucide-react';

export default function TeachersPage() {
  const { user: currentUser } = useAuthStore();
  const [teachers, setTeachers] = useState<IUser[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<IUser | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<IUser | null>(null);

  const fetchTeachers = useCallback(async () => {
    try {
      const data = await apiGetUsers({ role: UserRole.TEACHER });
      setTeachers(data);
    } catch (error) {
      console.error('Помилка завантаження викладачів:', error);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleCreateTeacher = async (values: IUserDto) => {
    setIsSubmitLoading(true);
    try {
      await apiCreateUser({ ...values, role: UserRole.TEACHER });
      setIsCreateOpen(false);
      fetchTeachers();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleUpdateTeacher = async (values: IUserDto) => {
    if (!editingTeacher) return;
    setIsSubmitLoading(true);
    try {
      await apiUpdateUser(editingTeacher._id, values);
      setEditingTeacher(null);
      fetchTeachers();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    const teacher = teachers.find(t => t._id === id);
    if (teacher) {
      setSelectedTeacher(teacher);
    }
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Викладачі</h1>
            <Badge variant="secondary" className="mt-1">
              {teachers.length} всього
            </Badge>
          </div>
          <p className="text-slate-500">Викладацький склад IT Академії та напрямки їх роботи</p>
        </div>

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
              <UserForm onSubmit={handleCreateTeacher} isSubmitting={isSubmitLoading} hideRoleSelect initialValues={{
                firstName: '',
                lastName: '',
                email: '',
                role: UserRole.TEACHER,
                phone: '',
              }} />
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
                  group: editingTeacher.group && typeof editingTeacher.group === 'object' ? (editingTeacher.group as any)._id : editingTeacher.group || ''
                }}
                onSubmit={handleUpdateTeacher} 
                isSubmitting={isSubmitLoading} 
                hideRoleSelect 
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((teacher) => (
          <TeacherCard 
            key={teacher._id} 
            teacher={teacher} 
            onViewDetails={handleViewDetails}
            onEdit={isAdmin ? setEditingTeacher : undefined}
          />
        ))}
      </div>

      <TeacherDetailsModal 
        teacher={selectedTeacher} 
        isOpen={!!selectedTeacher} 
        onClose={() => setSelectedTeacher(null)} 
      />
    </div>
  );
}
