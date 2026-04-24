import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TenantsPage } from './pages/TenantsPage';
import { TenantDetailPage } from './pages/TenantDetailPage';
import { PlansPage } from './pages/PlansPage';
import { BuildsPage } from './pages/BuildsPage';
import { ResellersPage } from './pages/ResellersPage';
import { SettingsPage } from './pages/SettingsPage';
import { BillingPage } from './pages/BillingPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

  {
    element: (
      <ProtectedRoute requiredRole="SUPER_ADMIN">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/tenants', element: <TenantsPage /> },
      { path: '/tenants/:id', element: <TenantDetailPage /> },
      { path: '/plans', element: <PlansPage /> },
      { path: '/billing', element: <BillingPage /> },
      { path: '/builds', element: <BuildsPage /> },
      { path: '/resellers', element: <ResellersPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },

  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default App;
