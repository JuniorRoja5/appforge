import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthLayout } from './layouts/AuthLayout';
import { PlatformLayout } from './layouts/PlatformLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewAppPage } from './pages/NewAppPage';
import { AppSettingsPage } from './pages/AppSettingsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AppUsersPage } from './pages/AppUsersPage';
import { BuilderLayout } from './features/builder/BuilderLayout';
import { AccountPage } from './pages/AccountPage';
import { PricingPage } from './pages/PricingPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { PaymentCancelPage } from './pages/PaymentCancelPage';
import { StampPage } from './pages/StampPage';
import { RedeemCouponPage } from './pages/RedeemCouponPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';

const router = createBrowserRouter([
  // Public routes (auth)
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // Protected routes (platform shell)
  {
    element: (
      <ProtectedRoute>
        <PlatformLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/apps/new', element: <NewAppPage /> },
      { path: '/apps/:appId/settings', element: <AppSettingsPage /> },
      { path: '/apps/:appId/analytics', element: <AnalyticsPage /> },
      { path: '/apps/:appId/users', element: <AppUsersPage /> },
      { path: '/account', element: <AccountPage /> },
      { path: '/pricing', element: <PricingPage /> },
      { path: '/payment/success', element: <PaymentSuccessPage /> },
      { path: '/payment/cancel', element: <PaymentCancelPage /> },
    ],
  },

  // Builder (fullscreen, own layout, protected)
  {
    path: '/apps/:appId/edit',
    element: (
      <ProtectedRoute>
        <BuilderLayout />
      </ProtectedRoute>
    ),
  },

  // Public standalone pages
  { path: '/stamp/:appId', element: <StampPage /> },
  { path: '/redeem/:appId', element: <RedeemCouponPage /> },
  { path: '/order/:appId/:orderId', element: <OrderTrackingPage /> },

  // Redirects
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default App;
