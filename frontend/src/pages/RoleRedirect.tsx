import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/authStore';

export default function RoleRedirect() {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'OWNER' ? '/dashboard' : '/pos'} replace />;
}
