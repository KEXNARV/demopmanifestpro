// ============================================
// ProtectedRoute - Protección de rutas por autenticación y permisos
// H02: Enforcement de acceso a rutas
// ============================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, Permission, AppRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredRole?: AppRole;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  allowedRoles
}) => {
  const { isAuthenticated, loading, hasPermission, hasRole, role } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Verificar permiso específico
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold text-destructive mb-4">Acceso Denegado</h2>
          <p className="text-muted-foreground mb-4">
            No tienes permiso para acceder a esta sección.
          </p>
          <p className="text-sm text-muted-foreground">
            Tu rol actual: <span className="font-semibold">{role || 'Sin rol'}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Permiso requerido: <span className="font-semibold">{requiredPermission}</span>
          </p>
        </div>
      </div>
    );
  }

  // Verificar rol específico
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold text-destructive mb-4">Acceso Denegado</h2>
          <p className="text-muted-foreground mb-4">
            Se requiere el rol de <span className="font-semibold">{requiredRole}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Tu rol actual: <span className="font-semibold">{role || 'Sin rol'}</span>
          </p>
        </div>
      </div>
    );
  }

  // Verificar lista de roles permitidos
  if (allowedRoles && allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold text-destructive mb-4">Acceso Denegado</h2>
          <p className="text-muted-foreground mb-4">
            Esta sección está restringida a ciertos roles.
          </p>
          <p className="text-sm text-muted-foreground">
            Tu rol: <span className="font-semibold">{role}</span> | 
            Roles permitidos: <span className="font-semibold">{allowedRoles.join(', ')}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
