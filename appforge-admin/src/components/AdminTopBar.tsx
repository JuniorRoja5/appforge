import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const AdminTopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user?.email || 'Admin';

  const avatarInitial = user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'A';

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm sticky top-0">
      <div
        className="flex items-center space-x-3 cursor-pointer group"
        onClick={() => navigate('/dashboard')}
      >
        <div className="w-8 h-8 rounded-lg bg-[#111111] flex items-center justify-center font-bold text-white shadow-md shadow-gray-200/50 text-xs shrink-0 group-hover:scale-105 transition-transform">
          AF
        </div>
        <h1 className="text-[15px] font-semibold tracking-tight text-gray-800">
          AppForge <span className="text-gray-400 font-medium ml-1">Admin</span>
        </h1>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white shadow-sm">
            {avatarInitial}
          </div>
          <span className="text-[13px] font-semibold text-gray-700 max-w-[150px] truncate hidden sm:block ml-1">
            {displayName}
          </span>
          <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200/60 py-1 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              <p className="text-xs text-orange-600 font-medium">Super Admin</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
