import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/features/auth/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import { UserRole } from '@redmonkey/shared';
import GroupsPage from '@/pages/GroupsPage';

// Тимчасові компоненти для тестування сторінок
const Dashboard = () => <div className="text-2xl font-bold">Dashboard (Всім доступно)</div>;
const Students = () => <div className="text-2xl font-bold">Студенти (Доступно Admin та Teacher)</div>;
const Settings = () => <div className="text-2xl font-bold">Налаштування (Тільки для Admin)</div>;

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Захищені сторінки системи */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/groups" element={<GroupsPage />} />
            

            {/* Роути для адміна та викладача */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.TEACHER]} />}>
              <Route path="/students" element={<Students />} />
            </Route>

            {/* Роути тільки для адміна */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}