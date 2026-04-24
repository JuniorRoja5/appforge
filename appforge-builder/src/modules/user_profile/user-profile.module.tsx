import React, { useState, useEffect } from 'react';
import type { ModuleDefinition } from '../base/module.interface';
import { z } from 'zod';
import {
  UserCircle, ChevronDown, ChevronUp,
  Loader2, Users, UserCheck, UserX, ExternalLink,
  Lock, LayoutTemplate, AlignCenter, CreditCard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { getAppUserStats } from '../../lib/api';

// --- Zod schema ---
const UserProfileConfigSchema = z.object({
  enabled: z.boolean(),
  allowRegistration: z.boolean(),
  layout: z.enum(['classic', 'centered', 'card']),
  requireLogin: z.boolean(),
  loginButtonText: z.string(),
  registrationButtonText: z.string(),
  buttonColor: z.string(),
  buttonTextColor: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type UserProfileConfig = z.infer<typeof UserProfileConfigSchema>;

// --- Preview Component ---
const PreviewComponent: React.FC<{ data: UserProfileConfig; isSelected: boolean }> = ({
  data,
  isSelected,
}) => {
  const token = useAuthStore((s) => s.token);
  const [stats, setStats] = useState<{ total: number; active: number; banned: number } | null>(null);

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    getAppUserStats(data.appId, token)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  const btnBg = data.buttonColor || 'var(--af-color-primary, #8b5cf6)';
  const btnText = data.buttonTextColor || '#ffffff';
  const layout = data.layout ?? 'classic';

  // --- Login form fields (shared across layouts) ---
  const loginForm = (
    <>
      <div className="w-full space-y-1.5">
        <div className="h-6 bg-gray-100 rounded-md" />
        <div className="h-6 bg-gray-100 rounded-md" />
        <div
          className="rounded-md flex items-center justify-center"
          style={{
            height: '1.5rem',
            backgroundColor: btnBg,
            borderRadius: 'var(--af-radius-button, 6px)',
          }}
        >
          <span className="text-[9px] font-medium" style={{ color: btnText }}>
            {data.loginButtonText || 'Entrar'}
          </span>
        </div>
      </div>
      {data.allowRegistration && (
        <p className="text-[9px] text-gray-400 mt-1">
          {data.registrationButtonText || 'Crear cuenta'}
        </p>
      )}
    </>
  );

  return (
    <div className={`h-full flex flex-col ${isSelected ? 'ring-2 ring-indigo-400 ring-inset rounded-lg' : ''}`}>
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: 'linear-gradient(to right, var(--af-color-primary, #8b5cf6), var(--af-color-secondary, #d946ef))' }}>
        <UserCircle size={16} className="text-white" />
        <span className="text-white text-xs font-semibold flex-1">Perfil de Usuario</span>
        {data.requireLogin && (
          <span className="flex items-center gap-0.5 bg-white/20 rounded-full px-1.5 py-0.5">
            <Lock size={8} className="text-white" />
            <span className="text-[8px] text-white font-medium">Login requerido</span>
          </span>
        )}
      </div>

      {/* --- CLASSIC layout --- */}
      {layout === 'classic' && (
        <div className="flex-1 p-3 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <UserCircle size={28} className="text-gray-400" />
          </div>
          <p className="text-[11px] font-semibold text-gray-700">Iniciar sesion</p>
          {loginForm}
        </div>
      )}

      {/* --- CENTERED layout --- */}
      {layout === 'centered' && (
        <div className="flex-1 p-3 flex flex-col items-center justify-center gap-2 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <UserCircle size={38} className="text-gray-400" />
          </div>
          <p className="text-[12px] font-bold text-gray-700">Iniciar sesion</p>
          {loginForm}
        </div>
      )}

      {/* --- CARD layout --- */}
      {layout === 'card' && (
        <div className="flex-1 p-3 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-4 w-full flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <UserCircle size={28} className="text-gray-400" />
            </div>
            <p className="text-[11px] font-semibold text-gray-700">Iniciar sesion</p>
            {loginForm}
          </div>
        </div>
      )}

      {/* Stats footer */}
      {stats && stats.total > 0 && (
        <div className="px-3 py-1.5 border-t flex items-center justify-center gap-1" style={{ backgroundColor: 'color-mix(in srgb, var(--af-color-primary, #8b5cf6) 8%, white)', borderColor: 'color-mix(in srgb, var(--af-color-primary, #8b5cf6) 15%, white)' }}>
          <Users size={10} style={{ color: 'var(--af-color-primary, #8b5cf6)' }} />
          <span className="text-[9px] font-medium" style={{ color: 'var(--af-color-primary, #8b5cf6)' }}>
            {stats.total} usuario{stats.total !== 1 ? 's' : ''} registrado{stats.total !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {!data.appId && (
        <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-100">
          <p className="text-[9px] text-amber-600 text-center">
            Vista previa — guarda la app para gestionar usuarios
          </p>
        </div>
      )}
    </div>
  );
};

// --- Runtime Component (placeholder — real logic is in Capacitor runtime) ---
const RuntimeComponent: React.FC<{ data: UserProfileConfig }> = () => (
  <div className="p-4 text-center text-gray-400 text-sm">
    <UserCircle size={24} className="mx-auto mb-2 text-gray-300" />
    Perfil de usuario activado
  </div>
);

// --- Settings Panel ---
const SettingsPanel: React.FC<{
  data: UserProfileConfig;
  onChange: (data: UserProfileConfig) => void;
}> = ({ data, onChange }) => {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ total: number; active: number; banned: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  useEffect(() => {
    if (!data.appId || !token) return;
    let cancelled = false;
    setLoading(true);
    getAppUserStats(data.appId, token)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [data.appId, data._refreshKey, token]);

  const layoutOptions: { value: UserProfileConfig['layout']; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'classic', label: 'Clasico', icon: <LayoutTemplate size={14} />, desc: 'Avatar a la izquierda, formulario debajo' },
    { value: 'centered', label: 'Centrado', icon: <AlignCenter size={14} />, desc: 'Todo centrado, avatar mas grande' },
    { value: 'card', label: 'Tarjeta', icon: <CreditCard size={14} />, desc: 'Formulario dentro de una tarjeta con sombra' },
  ];

  return (
    <div className="space-y-3">
      {/* ====== Config section ====== */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-700">Configuracion</span>
          {configOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {configOpen && (
          <div className="p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.enabled}
                onChange={(e) => onChange({ ...data, enabled: e.target.checked })}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-xs text-gray-700">Habilitado</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.allowRegistration}
                onChange={(e) => onChange({ ...data, allowRegistration: e.target.checked })}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-xs text-gray-700">Permitir registro de nuevos usuarios</span>
            </label>

            {/* Require login toggle */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock size={12} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">Requerir inicio de sesion</span>
                </div>
                <button
                  onClick={() => onChange({ ...data, requireLogin: !data.requireLogin })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    data.requireLogin ? 'bg-violet-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      data.requireLogin ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed pl-5">
                Si esta activo, el usuario debe iniciar sesion o crear una cuenta antes de usar la app
              </p>
            </div>

            {/* Login button text */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Texto del boton de login</label>
              <input
                type="text"
                value={data.loginButtonText}
                onChange={(e) => onChange({ ...data, loginButtonText: e.target.value })}
                className="w-full px-2 py-1.5 border rounded text-sm"
                placeholder="Entrar"
              />
            </div>

            {/* Registration button text */}
            {data.allowRegistration && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Texto del enlace de registro</label>
                <input
                  type="text"
                  value={data.registrationButtonText}
                  onChange={(e) => onChange({ ...data, registrationButtonText: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  placeholder="Crear cuenta"
                />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2">
              <p className="text-[10px] text-blue-700 leading-relaxed">
                Los usuarios de la app se registran con email y contrasena.
                Sus credenciales son independientes de la plataforma.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ====== Layout section ====== */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setLayoutOpen(!layoutOpen)}
          className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-700">Disposicion</span>
          {layoutOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {layoutOpen && (
          <div className="p-3 space-y-2">
            {layoutOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                  data.layout === option.value
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="userProfileLayout"
                  value={option.value}
                  checked={data.layout === option.value}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      layout: e.target.value as UserProfileConfig['layout'],
                    })
                  }
                  className="mt-0.5 accent-violet-600"
                />
                <div className="flex items-start gap-1.5">
                  <span className="text-violet-600 mt-0.5">{option.icon}</span>
                  <div>
                    <span className="text-xs font-medium text-gray-800">{option.label}</span>
                    <p className="text-[10px] text-gray-500">{option.desc}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ====== Colors section ====== */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setColorsOpen(!colorsOpen)}
          className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-700">Colores</span>
          {colorsOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {colorsOpen && (
          <div className="p-3 space-y-3">
            {/* Button color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Color del boton</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.buttonColor || '#8b5cf6'}
                  onChange={(e) => onChange({ ...data, buttonColor: e.target.value })}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={data.buttonColor}
                  onChange={(e) => onChange({ ...data, buttonColor: e.target.value })}
                  className="flex-1 px-2 py-1.5 border rounded text-sm font-mono"
                  placeholder="Vacio = color del tema"
                />
                {data.buttonColor && (
                  <button
                    onClick={() => onChange({ ...data, buttonColor: '' })}
                    className="text-[10px] text-gray-400 hover:text-gray-600 whitespace-nowrap"
                  >
                    Resetear
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Deja vacio para usar el color primario del tema</p>
            </div>

            {/* Button text color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Color del texto del boton</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.buttonTextColor || '#ffffff'}
                  onChange={(e) => onChange({ ...data, buttonTextColor: e.target.value })}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={data.buttonTextColor}
                  onChange={(e) => onChange({ ...data, buttonTextColor: e.target.value })}
                  className="flex-1 px-2 py-1.5 border rounded text-sm font-mono"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== Users summary + link ====== */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setUsersOpen(!usersOpen)}
          className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-700">Usuarios</span>
          {usersOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {usersOpen && (
          <div className="p-3 space-y-3">
            {!data.appId ? (
              <div className="text-center py-4">
                <UserCircle size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-400">Guarda la app primero para gestionar usuarios</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-gray-300" />
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <Users size={14} className="mx-auto text-gray-400 mb-0.5" />
                      <p className="text-sm font-bold text-gray-800">{stats.total}</p>
                      <p className="text-[9px] text-gray-500">Total</p>
                    </div>
                    <div className="text-center p-2 bg-emerald-50 rounded-lg">
                      <UserCheck size={14} className="mx-auto text-emerald-500 mb-0.5" />
                      <p className="text-sm font-bold text-emerald-700">{stats.active}</p>
                      <p className="text-[9px] text-emerald-600">Activos</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <UserX size={14} className="mx-auto text-red-500 mb-0.5" />
                      <p className="text-sm font-bold text-red-700">{stats.banned}</p>
                      <p className="text-[9px] text-red-600">Bloqueados</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 text-center py-3">
                    Aun no hay usuarios registrados
                  </p>
                )}

                {/* Link to full users page */}
                <button
                  onClick={() => navigate(`/apps/${data.appId}/users`)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors"
                >
                  <span className="text-xs font-semibold text-violet-700">Gestionar usuarios</span>
                  <ExternalLink size={12} className="text-violet-500" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Module Definition ---
export const UserProfileModule: ModuleDefinition<UserProfileConfig> = {
  id: 'user_profile',
  name: 'Perfil de Usuario',
  description: 'Autenticación y perfil para usuarios de tu app',
  icon: <UserCircle size={20} />,
  schema: UserProfileConfigSchema,
  defaultConfig: {
    enabled: true,
    allowRegistration: true,
    layout: 'classic',
    requireLogin: false,
    loginButtonText: 'Entrar',
    registrationButtonText: 'Crear cuenta',
    buttonColor: '',
    buttonTextColor: '#ffffff',
    appId: undefined,
    _refreshKey: 0,
  },
  PreviewComponent,
  RuntimeComponent,
  SettingsPanel,
};
