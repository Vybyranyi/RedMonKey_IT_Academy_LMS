import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { navigationItems } from './navigation';
import { ChevronLeft, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import axiosInstance from '@/api/axios';
import logo from '@/assets/logo.png';

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore();

  if (!user) return null;

  const filteredItems = navigationItems.filter(item => item.roles.includes(user.role));

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
      clearAuth();
    } catch (error) {
      console.error('Помилка при виході', error);
    }
  };

  return (
    <aside className="w-[260px] bg-[#29425D] text-slate-100 h-screen flex flex-col shadow-xl z-20 shrink-0">
      {/* Logo Section */}
      <div className="pt-6 pb-4 px-6 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] shadow-sm overflow-hidden relative">
           <img src={logo} alt="Logo" className="w-full h-full object-cover relative z-10" />
        </div>
        <div className="flex flex-col mt-1">
          <span className="text-[15px] font-extrabold leading-tight text-white tracking-wide">IT Academy</span>
          <span className="text-[11px] font-medium text-slate-400 mt-0.5">CRM Platform</span>
        </div>
      </div>

      <div className="h-px bg-slate-700/50 mx-4 mb-4"></div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-[12px] text-[14px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#C10000] text-white shadow-md'
                    : 'text-slate-300 hover:bg-[#1A3150] hover:text-white'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 mt-auto">
        <button className="flex items-center gap-2 text-[12px] font-semibold text-[#8B9DB4] hover:text-white transition-colors w-full justify-end px-2 mb-4">
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={3} />
          Згорнути
        </button>

        <div className="bg-[#1A3150] rounded-[16px] p-3 flex items-center gap-3 cursor-pointer hover:bg-[#152744] transition-all duration-200 relative group border border-transparent hover:border-slate-700/50 shadow-sm" onClick={handleLogout} title="Вийти">
          <Avatar className="h-9 w-9 ring-2 ring-[#29425D] group-hover:ring-slate-600 transition-colors bg-[#0070F3]">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="bg-[#0070F3] text-white font-bold text-xs">
              {user.firstName[0]}
              {user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-[13px] font-bold text-white truncate leading-tight mb-0.5">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[11px] font-medium text-[#8B9DB4] truncate">
              {user.role === 'admin' ? 'Адміністратор' : user.role === 'teacher' ? 'Викладач' : 'Студент'}
            </p>
          </div>
          <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <LogOut className="h-[14px] w-[14px] text-slate-400" />
          </div>
        </div>
      </div>
    </aside>
  );
}