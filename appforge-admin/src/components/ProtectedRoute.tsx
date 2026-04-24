import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'SUPER_ADMIN' | 'CLIENT';
}

export const ProtectedRoute: React.FC<Props> = ({ children, requiredRole }) => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso denegado</h1>
          <p className="text-gray-500">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
