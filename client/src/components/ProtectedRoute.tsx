import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '../api/auth';
import { hasAdminAccess } from '../lib/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Array<AuthUser['role']>;
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loader">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    if (user.role === 'teacher') return <Navigate to="/oqituvchi-kabinet" replace />;
    if (user.role === 'student') return <Navigate to="/mening-kabinetim" replace />;
    if (hasAdminAccess(user.role)) return <Navigate to="/" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}
