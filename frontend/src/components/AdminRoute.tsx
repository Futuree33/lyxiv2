import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
