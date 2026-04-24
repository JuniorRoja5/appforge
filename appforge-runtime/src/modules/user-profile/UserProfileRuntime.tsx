import React, { useState, useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { compressImage } from '../../lib/image-utils';
import { uploadAppUserImage } from '../../lib/api';
import { imgFallback } from '../../lib/img-fallback';
import { registerRuntimeModule } from '../registry';
import {
  isAuthenticated,
  getCurrentUser,
  login,
  register,
  updateProfile,
  logout,
  onAuthChange,
  type AppUserData,
} from '../../lib/auth';

type Tab = 'login' | 'register';

const UserProfileRuntime: React.FC<{
  data: Record<string, unknown>;
  apiUrl: string;
  appId: string;
}> = ({ data }) => {
  const [user, setUser] = useState<AppUserData | null>(getCurrentUser());
  const [authed, setAuthed] = useState(isAuthenticated());

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u);
      setAuthed(u !== null);
    });
  }, []);

  if (authed && user) {
    return <ProfileView user={user} />;
  }

  return (
    <AuthForm
      allowRegistration={(data.allowRegistration as boolean) ?? true}
      loginButtonText={(data.loginButtonText as string) || 'Entrar'}
      registrationButtonText={(data.registrationButtonText as string) || 'Crear cuenta'}
      buttonColor={(data.buttonColor as string) || ''}
      buttonTextColor={(data.buttonTextColor as string) || '#ffffff'}
    />
  );
};

// ──────────── Auth Form (Login/Register) ────────────

const AuthForm: React.FC<{
  allowRegistration: boolean;
  loginButtonText: string;
  registrationButtonText: string;
  buttonColor: string;
  buttonTextColor: string;
}> = ({ allowRegistration, loginButtonText, registrationButtonText, buttonColor, buttonTextColor }) => {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(email, password, firstName || undefined, lastName || undefined);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-sm mx-auto">
      {allowRegistration && (
        <div className="flex rounded-lg overflow-hidden mb-4" style={{ border: '1px solid var(--color-divider, #e5e7eb)' }}>
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === 'login' ? (buttonColor || 'var(--color-primary, #6366f1)') : 'transparent',
              color: tab === 'login' ? (buttonTextColor || 'var(--color-text-on-primary, #fff)') : 'var(--color-text-secondary, #6b7280)',
            }}
          >
            {loginButtonText}
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === 'register' ? (buttonColor || 'var(--color-primary, #6366f1)') : 'transparent',
              color: tab === 'register' ? (buttonTextColor || 'var(--color-text-on-primary, #fff)') : 'var(--color-text-secondary, #6b7280)',
            }}
          >
            {registrationButtonText}
          </button>
        </div>
      )}

      {!allowRegistration && (
        <h2
          className="text-lg font-semibold mb-4 text-center"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          Iniciar sesión
        </h2>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {tab === 'register' && (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-surface-card, #fff)',
                border: '1px solid var(--color-divider, #e5e7eb)',
                color: 'var(--color-text-primary, #111827)',
              }}
            />
            <input
              type="text"
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-surface-card, #fff)',
                border: '1px solid var(--color-divider, #e5e7eb)',
                color: 'var(--color-text-primary, #111827)',
              }}
            />
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-surface-card, #fff)',
            border: '1px solid var(--color-divider, #e5e7eb)',
            color: 'var(--color-text-primary, #111827)',
          }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-surface-card, #fff)',
            border: '1px solid var(--color-divider, #e5e7eb)',
            color: 'var(--color-text-primary, #111827)',
          }}
        />

        {error && (
          <p className="text-sm px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--color-feedback-error, #ef4444)20', color: 'var(--color-feedback-error, #ef4444)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: buttonColor || 'var(--color-primary, #6366f1)',
            color: buttonTextColor || 'var(--color-text-on-primary, #fff)',
          }}
        >
          {loading ? '...' : tab === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  );
};

// ──────────── Profile View ────────────

const ProfileView: React.FC<{ user: AppUserData }> = ({ user }) => {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const result = await uploadAppUserImage(compressed);
      await updateProfile({ avatarUrl: result.url });
    } catch {
      // silent
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ firstName: firstName || undefined, lastName: lastName || undefined });
      setEditing(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="p-4 max-w-sm mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* Avatar + info */}
      <div className="flex flex-col items-center mb-4">
        <div
          className="relative cursor-pointer mb-2"
          onClick={() => fileRef.current?.click()}
        >
          {user.avatarUrl ? (
            <img
              src={resolveAssetUrl(user.avatarUrl)}
              alt=""
              className="w-16 h-16 rounded-full object-cover"
              onError={imgFallback}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{
                backgroundColor: 'var(--color-primary-light, #e0e7ff)',
                color: 'var(--color-primary, #6366f1)',
              }}
            >
              {(user.firstName?.[0] ?? user.email[0]).toUpperCase()}
            </div>
          )}
          {/* Camera overlay */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
            style={{ backgroundColor: 'var(--color-primary, #6366f1)' }}
          >
            {uploading ? (
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={12} className="text-white" />
            )}
          </div>
        </div>
        <p
          className="text-base font-semibold"
          style={{ color: 'var(--color-text-primary, #111827)' }}
        >
          {displayName}
        </p>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-secondary, #6b7280)' }}
        >
          {user.email}
        </p>
      </div>

      {/* Edit form */}
      {editing ? (
        <div className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Nombre"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-surface-card, #fff)',
              border: '1px solid var(--color-divider, #e5e7eb)',
              color: 'var(--color-text-primary, #111827)',
            }}
          />
          <input
            type="text"
            placeholder="Apellido"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-surface-card, #fff)',
              border: '1px solid var(--color-divider, #e5e7eb)',
              color: 'var(--color-text-primary, #111827)',
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary, #6366f1)',
                color: 'var(--color-text-on-primary, #fff)',
              }}
            >
              {saving ? '...' : 'Guardar'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'var(--color-surface-variant, #f3f4f6)',
                color: 'var(--color-text-secondary, #6b7280)',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full py-2 rounded-lg text-sm font-medium mb-2"
          style={{
            backgroundColor: 'var(--color-surface-variant, #f3f4f6)',
            color: 'var(--color-text-primary, #111827)',
          }}
        >
          Editar perfil
        </button>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-2 rounded-lg text-sm font-medium"
        style={{
          backgroundColor: 'var(--color-feedback-error, #ef4444)15',
          color: 'var(--color-feedback-error, #ef4444)',
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
};

registerRuntimeModule({
  id: 'user_profile',
  Component: UserProfileRuntime,
});
