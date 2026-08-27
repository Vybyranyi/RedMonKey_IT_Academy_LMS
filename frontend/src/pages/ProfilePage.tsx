import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/utils/apiError';
import { apiUpdateProfile, apiChangePassword, type UpdateProfileDto, type ChangePasswordDto } from '@/api/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, KeyRound } from 'lucide-react';
import { UserRole } from '@redmonkey/shared';
import ProfileForm from '@/components/features/users/ProfileForm';
import ChangePasswordForm from '@/components/features/users/ChangePasswordForm';

const roleLabel: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Адміністратор',
  [UserRole.TEACHER]: 'Викладач',
  [UserRole.STUDENT]: 'Студент',
};

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleUpdateProfile = async (values: Partial<UpdateProfileDto>) => {
    // Бекенд відхиляє порожній PATCH — не смикаємо його, якщо нічого не змінилось
    if (Object.keys(values).length === 0) {
      setIsEditOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedUser = await apiUpdateProfile(values);
      setUser({ ...user, ...updatedUser });
      toast.success('Профіль оновлено');
      setIsEditOpen(false);
    } catch (error) {
      console.error('Помилка при оновленні профілю', error);
      toast.error(getApiErrorMessage(error, 'Не вдалося оновити профіль'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (values: ChangePasswordDto) => {
    setIsSubmitting(true);
    try {
      await apiChangePassword(values);
      toast.success('Пароль успішно змінено');
      setIsPasswordOpen(false);
    } catch (error) {
      console.error('Помилка при зміні пароля', error);
      toast.error(getApiErrorMessage(error, 'Не вдалося змінити пароль'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Мій профіль</h1>
        <p className="text-slate-500">Перегляд та редагування власних даних</p>
      </div>

      <div className="bg-[#1A2645] rounded-2xl p-6 flex items-center gap-5 text-white shadow-sm">
        <Avatar className="h-20 w-20 border-2 border-white/20">
          <AvatarImage src={user.avatar || undefined} />
          <AvatarFallback className="bg-[#0070F3] text-2xl font-bold text-white">
            {user.firstName[0]}
            {user.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1.5 flex-1">
          <h3 className="text-2xl font-bold tracking-tight">{user.firstName} {user.lastName}</h3>
          <p className="text-slate-300 text-sm">{user.email}</p>
          <div className="flex items-center gap-2 pt-1">
            <Badge className="bg-white/10 text-slate-100 hover:bg-white/20 border-none px-3 font-semibold">
              {roleLabel[user.role]}
            </Badge>
            {user.role === UserRole.STUDENT && (
              <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-none px-3 font-semibold">
                🪙 {user.redCoins} RedCoins
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Редагувати профіль
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редагування профілю</DialogTitle>
            </DialogHeader>
            <ProfileForm
              initialValues={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone || '', avatar: user.avatar || '' }}
              onSubmit={handleUpdateProfile}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Змінити пароль
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Зміна пароля</DialogTitle>
            </DialogHeader>
            <ChangePasswordForm onSubmit={handleChangePassword} isSubmitting={isSubmitting} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
