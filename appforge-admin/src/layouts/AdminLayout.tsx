import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AdminTopBar } from '../components/AdminTopBar';
import { AdminSideNav } from '../components/AdminSideNav';

export const AdminLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden font-sans">
      <AdminTopBar />
      <div className="flex flex-1 overflow-hidden">
        <AdminSideNav />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="top-right" closeButton />
    </div>
  );
};
