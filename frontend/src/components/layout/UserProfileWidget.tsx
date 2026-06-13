import axiosInstance from "@/api/axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserProfileWidgetProps {
  isCollapsed: boolean;
}

export default function UserProfileWidget({
  isCollapsed,
}: UserProfileWidgetProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axiosInstance.post("/auth/logout");
      clearAuth();
    } catch (error) {
      console.error("Помилка при виході", error);
    }
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <div
      className={`bg-[#1A3150] rounded-[16px] flex items-center cursor-pointer hover:bg-[#152744] transition-all duration-200 relative group border border-transparent hover:border-slate-700/50 shadow-sm ${isCollapsed ? "p-2 justify-center" : "p-3 gap-3"}`}
      onClick={handleProfileClick}
      title="Профіль"
    >
      <Avatar
        className={`ring-2 ring-[#29425D] group-hover:ring-slate-600 transition-colors bg-[#0070F3] ${isCollapsed ? "h-10 w-10" : "h-9 w-9"}`}
      >
        <AvatarImage src={user.avatar || undefined} />
        <AvatarFallback className="bg-[#0070F3] text-white font-bold text-xs">
          {user.firstName[0]}
          {user.lastName[0]}
        </AvatarFallback>
      </Avatar>

      {!isCollapsed && (
        <>
          <div className="flex-1 overflow-hidden">
            <p className="text-[13px] font-bold text-white truncate leading-tight mb-0.5">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[11px] font-medium text-[#8B9DB4] truncate">
              {user.role === "admin"
                ? "Адміністратор"
                : user.role === "teacher"
                  ? "Викладач"
                  : "Студент"}
            </p>
          </div>
          <button
            className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white p-1 rounded-md"
            onClick={handleLogout}
            title="Вийти"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-400 hover:text-white transition-colors" />
          </button>
        </>
      )}

      {isCollapsed && (
        <button
          className="absolute -top-2 -right-2 bg-[#C10000] p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          onClick={handleLogout}
          title="Вийти"
        >
          <LogOut className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
