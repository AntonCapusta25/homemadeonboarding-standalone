import { Navigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { CoolLoader } from '@/components/dashboard/CoolLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/auth' 
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <CoolLoader />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      // Redirect based on actual role
      if (role === 'admin') {
        return <Navigate to="/admin" replace />;
      } else if (role === 'chef') {
        return <Navigate to="/dashboard" replace />;
      }
      return <Navigate to="/auth" replace />;
    }
  }

  return <>{children}</>;
}
