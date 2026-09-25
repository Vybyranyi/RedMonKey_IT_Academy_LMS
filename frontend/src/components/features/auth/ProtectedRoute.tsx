import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { UserRole } from '@redmonkey/shared';
import ForbiddenPage from '@/pages/ForbiddenPage';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Запам'ятовуємо, куди йшли: після входу (зокрема після протухлої сесії)
    // LoginPage поверне саме сюди, а не на головну
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <ForbiddenPage />;
  }

  // Відображаємо дочірні маршрути
  return <Outlet />;
}
