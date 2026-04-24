import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { SideNav } from '../components/SideNav';

export const PlatformLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden font-sans">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
