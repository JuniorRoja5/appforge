import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Hammer,
  Store,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tenants', label: 'Clientes', icon: Users },
  { to: '/plans', label: 'Planes', icon: CreditCard },
  { to: '/billing', label: 'Facturación', icon: Receipt },
  { to: '/builds', label: 'Builds', icon: Hammer },
  { to: '/resellers', label: 'Resellers', icon: Store },
  { to: '/settings', label: 'Configuración', icon: Settings },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
    isActive
      ? 'bg-orange-50/80 text-orange-600 shadow-sm ring-1 ring-orange-500/10'
      : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
  }`;

export const AdminSideNav: React.FC = () => {
  return (
    <nav className="w-[240px] bg-white border-r border-gray-200/60 flex flex-col h-[calc(100vh-4rem)] p-4 space-y-1.5 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 sticky top-16">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#a3a3a3] mb-3 px-3">
        Menú Principal
      </div>
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} className={linkClass}>
          <item.icon className="w-[18px] h-[18px]" strokeWidth={2.5} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
