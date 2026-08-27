import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/utils/apiError';
import { apiUpdateProfile, apiChangePassword } from '@/api/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, KeyRound } from 'lucide-react';
import { UserRole, type IChangePasswordDto } from '@redmonkey/shared';
import { Skeleton } from '@/components/ui/skeleton';
import ProfileForm, { type ProfileFormValues } from '@/components/features/users/ProfileForm';
import ChangePasswordForm from '@/components/features/users/ChangePasswordForm';

const roleLabel: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Адміністратор',
  [UserRole.TEACHER]: 'Викладач',
  [UserRole.STUDENT]: 'Студент',
};

export default function ProfilePage() {
  const { user, setUser, updateAccessToken } = useAuthStore();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  const handleUpdateProfile = async (values: Partial<ProfileFormValues>) => {
    // Бекенд відхиляє порожній PATCH — не смикаємо його, якщо нічого не змінилось
    if (Object.keys(values).length === 0) {
      setIsEditOpen(false);
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatedUser = await apiUpdateProfile(values);
      setUser({ ...user, ...updatedUser });
      toast.success('Профіль оновлено');
      setIsEditOpen(false);
    } catch (error) {
      console.error('Помилка при оновленні профілю', error);
      toast.error(getApiErrorMessage(error, 'Не вдалося оновити профіль'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (values: IChangePasswordDto) => {
    setIsChangingPassword(true);
    try {
      // Стара пара токенів уже відкликана — без цього перший же запит
      // після зміни пароля пішов би зі здохлим access-токеном
      updateAccessToken(await apiChangePassword(values));
      toast.success('Пароль успішно змінено');
      setIsPasswordOpen(false);
    } catch (error) {
      console.error('Помилка при зміні пароля', error);
      toast.error(getApiErrorMessage(error, 'Не вдалося змінити пароль'));
    } finally {
      setIsChangingPassword(false);
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
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
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
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Редагування профілю</DialogTitle>
            </DialogHeader>
            <ProfileForm
              initialValues={{ firstName: user.firstName, lastName: user.lastName, phone: user.phone || '', avatar: user.avatar || '' }}
              onSubmit={handleUpdateProfile}
              isSubmitting={isSavingProfile}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Змінити пароль
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Зміна пароля</DialogTitle>
            </DialogHeader>
            <ChangePasswordForm onSubmit={handleChangePassword} isSubmitting={isChangingPassword} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
