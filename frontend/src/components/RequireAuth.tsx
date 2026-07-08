import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/authStore';
import type { Role } from '@/types';

interface Props {
  children: React.ReactNode;
  roles?: Role[];
}

export function RequireAuth({ children, roles }: Props) {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Send to whichever home page is appropriate for their role
    return <Navigate to={user.role === 'OWNER' ? '/dashboard' : '/pos'} replace />;
  }

  return <>{children}</>;
}
