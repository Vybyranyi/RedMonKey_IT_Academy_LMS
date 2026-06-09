import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/api/axios';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function Header() {
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
      clearAuth();
    } catch (error) {
      console.error('Помилка при виході', error);
    }
  };

  if (!user) return null;

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-700">IT Academy Portal</h2>
      </div>
      <div className="flex items-center gap-6">
        {user.role === 'student' && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <span className="text-sm font-semibold text-amber-700">🪙 {user.redCoins} RedCoins</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="bg-slate-200 text-slate-700">
              {user.firstName[0]}
              {user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="text-left leading-none">
            <p className="text-sm font-medium text-slate-800">
              {user.firstName} {user.lastName}
            </p>
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
              {user.role}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-destructive">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}