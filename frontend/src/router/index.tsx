import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/features/auth/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import { UserRole } from '@redmonkey/shared';
import NotFoundPage from '@/pages/NotFoundPage';
import { lazyPage } from '@/lib/lazyPage';

const GroupsPage = lazyPage(() => import('@/pages/GroupsPage'));
const DashboardPage = lazyPage(() => import('@/pages/DashboardPage'));
const StudentsPage = lazyPage(() => import('@/pages/StudentsPage'));
const TeachersPage = lazyPage(() => import('@/pages/TeachersPage'));
const SchedulePage = lazyPage(() => import('@/pages/SchedulePage'));
const GradesPage = lazyPage(() => import('@/pages/GradesPage'));
const CoinsPage = lazyPage(() => import('@/pages/CoinsPage'));
const ProfilePage = lazyPage(() => import('@/pages/ProfilePage'));

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
            <Route path="/profile" element={<ProfilePage />} />

            {/* Роути для адміна та викладача */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.TEACHER]} />}>
              <Route path="/students" element={<StudentsPage />} />
            </Route>

            {/* Роути тільки для адміна */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
              <Route path="/teachers" element={<TeachersPage />} />
              <Route path="/groups" element={<GroupsPage />} />
            </Route>

            {/* Невідомий URL — 404 всередині layout, щоб лишалась навігація */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
