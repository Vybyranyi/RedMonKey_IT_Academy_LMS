import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { UserRole } from '@redmonkey/shared';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    // Перенаправляємо на сторінку входу
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Якщо немає права доступу, повертаємо на головну
    return <Navigate to="/" replace />;
  }

  // Відображаємо дочірні маршрути
  return <Outlet />;
}