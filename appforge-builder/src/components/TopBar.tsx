import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { resolveAssetUrl } from '../lib/resolve-asset-url';

export const TopBar: React.FC = () => {
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
    : user?.email || 'Usuario';

  const avatarInitial = user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
      <div
        className="flex items-center space-x-3 cursor-pointer"
        onClick={() => navigate('/dashboard')}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-blue-500/20">
          AF
        </div>
        <h1 className="text-[17px] font-semibold tracking-tight text-gray-900">
          AppForge <span className="text-gray-400 font-normal">Builder</span>
        </h1>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {user?.avatarUrl ? (
            <img
              src={resolveAssetUrl(user.avatarUrl)}
              alt=""
              className="w-7 h-7 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
              {avatarInitial}
            </div>
          )}
          <span className="text-sm text-gray-700 max-w-[150px] truncate hidden sm:block">
            {displayName}
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200/60 py-1 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>
            <button
              onClick={() => { setDropdownOpen(false); navigate('/account'); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Mi Cuenta
            </button>
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
