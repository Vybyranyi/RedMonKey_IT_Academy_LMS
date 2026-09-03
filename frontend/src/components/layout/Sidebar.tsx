import logo from "@/assets/logo.png";
import { useAuthStore } from "@/store/authStore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { navigationItems } from "./navigation";
import UserProfileWidget from "./UserProfileWidget";

export default function Sidebar() {
  const { user } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) return null;

  const filteredItems = navigationItems.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <aside
      className={`${isCollapsed ? "w-20" : "w-65"} bg-[#29425D] text-slate-100 h-screen flex flex-col shadow-xl z-20 shrink-0 transition-all duration-300 ease-in-out`}
    >
      {/* Logo Section */}
      <div
        className={`pt-6 pb-4 flex items-center gap-3 ${isCollapsed ? "px-0 justify-center" : "px-6"}`}
      >
        <div
          className={`flex shrink-0 items-center justify-center rounded-[10px] shadow-sm overflow-hidden relative ${isCollapsed ? "h-10 w-10" : "h-11 w-11"}`}
        >
          <img
            src={logo}
            alt="Logo"
            className="w-full h-full object-cover relative z-10"
          />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col mt-1 overflow-hidden whitespace-nowrap">
            <span className="text-[15px] font-extrabold leading-tight text-white tracking-wide">
              IT Academy
            </span>
            <span className="text-[11px] font-medium text-slate-400 mt-0.5">
              CRM Platform
            </span>
          </div>
        )}
      </div>

      <div
        className={`h-px bg-slate-700/50 mb-4 ${isCollapsed ? "mx-3" : "mx-4"}`}
      ></div>

      {/* Navigation */}
      <nav
        className={`flex-1 space-y-1.5 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent ${isCollapsed ? "px-2" : "px-3"}`}
      >
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-[12px] text-[14px] font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-[#C10000] text-white shadow-md"
                    : "text-slate-300 hover:bg-[#1A3150] hover:text-white"
                } ${isCollapsed ? "justify-center p-3" : "gap-3.5 px-4 py-3"}`
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2.5} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`p-4 mt-auto ${isCollapsed ? "px-2" : ""}`}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center gap-2 text-[12px] font-semibold text-[#8B9DB4] hover:text-white transition-colors w-full mb-4 ${isCollapsed ? "justify-center" : "justify-end px-2"}`}
          title={isCollapsed ? "Розгорнути" : "Згорнути"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" strokeWidth={3} />
          ) : (
            <>
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={3} />
              Згорнути
            </>
          )}
        </button>

        <UserProfileWidget isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}
