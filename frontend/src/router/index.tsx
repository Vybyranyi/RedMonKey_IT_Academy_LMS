import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/features/auth/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import { UserRole } from '@redmonkey/shared';
import GroupsPage from '@/pages/GroupsPage';
import DashboardPage from '@/pages/DashboardPage';
import StudentsPage from '@/pages/StudentsPage';
import TeachersPage from '@/pages/TeachersPage';
import SchedulePage from '@/pages/SchedulePage';
import GradesPage from '@/pages/GradesPage';
import CoinsPage from '@/pages/CoinsPage';
import SettingsPage from '@/pages/SettingsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Захищені сторінки системи */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Спільні роути (Admin, Teacher, Student) */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/grades" element={<GradesPage />} />
            <Route path="/coins" element={<CoinsPage />} />

            {/* Роути для адміна та викладача */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.TEACHER]} />}>
              <Route path="/students" element={<StudentsPage />} />
            </Route>

            {/* Роути тільки для адміна */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
              <Route path="/teachers" element={<TeachersPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}