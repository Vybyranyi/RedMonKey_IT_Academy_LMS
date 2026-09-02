import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Menu, X } from 'lucide-react';

export default function AppLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex bg-[#F8F9FA] min-h-screen font-sans overflow-x-hidden relative">
      {/* 1. Напівпрозорий темний фон під час відкритого меню на мобільці */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 2. Сайдбар: на ПК зазвичай, на мобільці — висувається зліва */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar />
      </div>

      {/* 3. Основна область сторінки */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto">

            {/* Кнопка відкриття меню (тільки для мобільних) */}
            <div className="p-4 pb-0 md:hidden flex items-center gap-3">
              <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="p-2 rounded-xl bg-[#29425D] text-white shadow-md active:scale-95 transition-transform"
                aria-label="Toggle menu"
              >
                {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <span className="font-bold text-slate-800 text-lg">IT Academy</span>
            </div>

            <Header />
            <main className="px-4 sm:px-8 pb-6 sm:pb-10">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
