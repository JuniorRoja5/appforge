import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
