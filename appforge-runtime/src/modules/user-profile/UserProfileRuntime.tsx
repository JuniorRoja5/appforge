import React, { useState, useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { compressImage } from '../../lib/image-utils';
import { uploadAppUserImage, requestPasswordReset } from '../../lib/api';
import { showPrompt, showAlert, showConfirm } from '../../lib/dialogs';
import { BrowserShim as Browser } from '../../lib/platform';
import { loadManifest } from '../../lib/manifest';
import { imgFallback } from '../../lib/img-fallback';
import { registerRuntimeModule } from '../registry';
import {
  isAuthenticated,
  getCurrentUser,
  login,
  register,
  updateProfile,
  logout,
  deleteMyAccount,
  onAuthChange,
  type AppUserData,
} from '../../lib/auth';
// Phase 3b (B3) — no inline sub-interfaces to dedupe here (`AppUserData`
// is API-derived from lib/auth, `Tab` is a local UI enum). Schema
// lives in appforge-shared/src/module-schemas/user_profile.schema.ts
// and will be imported in Phase 3c when safeParse + fallback UX
// arrives. No latent hooks: this module has no header title.

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

        {tab === 'login' && (
          <button
            type="button"
            onClick={async () => {
              const emailInput = await showPrompt(
                'Introduce el email de tu cuenta. Te enviaremos un enlace para crear una nueva contraseña.',
                {
                  title: 'Recuperar contraseña',
                  defaultValue: email,
                  placeholder: 'tu@email.com',
                  required: true,
                },
              );
              if (!emailInput) return;
              try {
                await requestPasswordReset(emailInput);
                // Backend deliberately returns the same generic success
                // whether or not the email exists, so the dialog text
                // mirrors that anti-enumeration stance — "si existe...".
                await showAlert(
                  'Si existe una cuenta con ese email, te hemos enviado las instrucciones. Revisa tu bandeja de entrada.',
                  { title: 'Email enviado' },
                );
              } catch {
                // Network / server-down failures are honest errors — surfacing
                // them is not an enumeration leak (no info about the email),
                // and silently pretending we sent the email would mislead the
                // user when they don't receive anything.
                await showAlert(
                  'No se pudo enviar el email. Comprueba tu conexión e inténtalo de nuevo.',
                  { title: 'Error de conexión' },
                );
              }
            }}
            className="text-xs underline self-start"
            style={{ color: 'var(--color-text-secondary, #6b7280)' }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

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
  const [deleting, setDeleting] = useState(false);
  // G2 Pieza 2: URL de política de privacidad para el link in-app. Viene
  // del manifest horneado server-side por build.processor.resolvePrivacyUrl.
  // El runtime NO re-implementa la regla — solo lee el string final
  // (privacy.url externa del cliente, o página pública generada, o null).
  // Si null, escondemos el link entero.
  const [privacyUrl, setPrivacyUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadManifest()
      .then((m) => setPrivacyUrl(m.appConfig.privacyUrlResolved ?? null))
      .catch(() => setPrivacyUrl(null));
  }, []);

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

  // G2 Pieza 2: abre la URL de privacidad con BrowserShim (Capacitor-safe).
  // Nunca window.open crudo, nunca target="_blank" en <a> — el shim hace
  // el routing PWA/native internamente.
  const handleOpenPrivacy = async () => {
    if (!privacyUrl) return;
    try {
      await Browser.open({ url: privacyUrl });
    } catch {
      // BrowserShim tiene su propio fallback interno (Capacitor → window.open).
      // Si incluso ese falla, swallow — el usuario puede volver a intentar.
    }
  };

  // G2 Pieza 2: borrado de cuenta iniciado por el end-user.
  // Confirmación destructiva (rojo) + DELETE /apps/:appId/users/me + logout local.
  // showConfirm({ destructive: true }) usa --color-feedback-error en el botón
  // confirm — convención mobile contra clic accidental por inercia.
  const handleDeleteAccount = async () => {
    const confirmed = await showConfirm(
      'Esta acción no se puede deshacer. Se eliminarán tus datos personales (nombre, email, teléfono, fotos) y tu contenido publicado en la app. Los pedidos y reservas pasados se conservan anonimizados por motivos contables.',
      {
        title: 'Eliminar mi cuenta',
        confirmLabel: 'Sí, eliminar',
        cancelLabel: 'Cancelar',
        destructive: true,
      },
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteMyAccount();
      // deleteMyAccount llama logout() internamente tras éxito — la sesión
      // local queda limpia (Preferences + state + detach FCM). El AppUser
      // será expulsado a la pantalla de login del runtime por el cambio de
      // estado auth, sin necesidad de redirect manual.
    } catch (err) {
      setDeleting(false);
      await showAlert(
        err instanceof Error ? err.message : 'No se pudo eliminar la cuenta. Inténtalo más tarde.',
        { title: 'Error' },
      );
    }
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

      {/* G2 Pieza 2: link a política de privacidad (si está configurada).
          Solo aparece si manifest.privacyUrlResolved no es null (el resolver
          de tracking-urls.ts decide). Usa BrowserShim, NO <a target="_blank">
          ni window.open crudos — Capacitor-safe. */}
      {privacyUrl && (
        <button
          onClick={handleOpenPrivacy}
          className="w-full mt-3 py-2 text-xs underline"
          style={{ color: 'var(--color-text-secondary, #6b7280)' }}
        >
          Política de privacidad
        </button>
      )}

      {/* G2 Pieza 2: Eliminar cuenta. Estilo destructivo más prominente
          que el logout (texto rojo + borde rojo) para señalar irreversibilidad.
          La confirmación pasa por showConfirm({ destructive: true }) → botón
          confirm en rojo del dialog (var --color-feedback-error). */}
      <button
        onClick={handleDeleteAccount}
        disabled={deleting}
        className="w-full mt-6 py-2 rounded-lg text-sm font-medium"
        style={{
          backgroundColor: 'transparent',
          color: 'var(--color-feedback-error, #ef4444)',
          border: '1px solid var(--color-feedback-error, #ef4444)',
          opacity: deleting ? 0.5 : 1,
          cursor: deleting ? 'wait' : 'pointer',
        }}
      >
        {deleting ? 'Eliminando…' : 'Eliminar mi cuenta'}
      </button>
    </div>
  );
};

registerRuntimeModule({
  id: 'user_profile',
  Component: UserProfileRuntime,
});
