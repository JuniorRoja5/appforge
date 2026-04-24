import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { resolveAssetUrl } from '../lib/resolve-asset-url';
import {
  getProfile,
  updateProfile,
  changePassword,
  requestAccountDeletion,
  uploadAvatar,
  getSubscription,
  cancelStripeSubscription,
  createPortalSession,
  type UserProfile,
  type SubscriptionInfo,
} from '../lib/api';

export const AccountPage: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Billing state
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [billingMsg, setBillingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      getProfile(token),
      getSubscription(token).catch(() => null),
    ])
      .then(([profileData, subData]) => {
        setProfile(profileData);
        setSub(subData);
      })
      .catch(() => setProfileMsg({ type: 'error', text: 'Error al cargar el perfil.' }))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'La imagen no puede superar 2MB.' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await uploadAvatar(file, token);
      setProfile((prev) => prev ? { ...prev, avatarUrl: result.url } : prev);
      // Also save to backend immediately
      await updateProfile({ avatarUrl: result.url }, token);
      updateUser({ avatarUrl: result.url });
      setProfileMsg({ type: 'success', text: 'Avatar actualizado.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al subir avatar.' });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !token) return;
    setSaving(true);
    setProfileMsg(null);
    try {
      const updated = await updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        company: profile.company,
        phone: profile.phone,
        address: profile.address,
        address2: profile.address2,
        zipCode: profile.zipCode,
        city: profile.city,
        country: profile.country,
        stateProvince: profile.stateProvince,
      }, token);
      setProfile(updated);
      updateUser({
        firstName: updated.firstName,
        lastName: updated.lastName,
        company: updated.company,
        avatarUrl: updated.avatarUrl,
      });
      setProfileMsg({ type: 'success', text: 'Perfil guardado correctamente.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    if (!token) return;
    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword }, token);
      setPasswordMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al cambiar contraseña.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!token || !deletePassword) return;
    setDeleteMsg(null);
    setDeleting(true);
    try {
      await requestAccountDeletion(deletePassword, token);
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al solicitar eliminación.' });
    } finally {
      setDeleting(false);
    }
  };

  const updateField = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Configuración de Cuenta</h1>
        <p className="text-[15px] text-gray-500 mt-2 font-medium">Gestiona tu perfil personal, preferencias de seguridad y facturación</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Izquierda (Columna principal 2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Avatar + Profile Info */}
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Información personal</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative group shrink-0"
            disabled={uploadingAvatar}
          >
            {profile?.avatarUrl ? (
              <img
                src={resolveAssetUrl(profile.avatarUrl)}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 group-hover:border-indigo-400 transition-colors"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold group-hover:from-indigo-600 group-hover:to-purple-700 transition-colors">
                {profile?.firstName?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
              <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarUpload} />
          <div>
            <p className="text-sm font-medium text-gray-700">Foto de perfil</p>
            <p className="text-xs text-gray-400">JPG, PNG, GIF o WEBP. Máximo 2MB.</p>
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input
              type="text"
              value={profile?.firstName ?? ''}
              onChange={(e) => updateField('firstName', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="Juan"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
            <input
              type="text"
              value={profile?.lastName ?? ''}
              onChange={(e) => updateField('lastName', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="Pérez"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
            <input
              type="text"
              value={profile?.company ?? ''}
              onChange={(e) => updateField('company', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="Mi Empresa S.L."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={profile?.email ?? ''}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
          <input
            type="text"
            value={profile?.address ?? ''}
            onChange={(e) => updateField('address', e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
            placeholder="Calle Principal 123"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Dirección 2</label>
          <input
            type="text"
            value={profile?.address2 ?? ''}
            onChange={(e) => updateField('address2', e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
            placeholder="Piso 2, Puerta B"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código Postal</label>
            <input
              type="text"
              value={profile?.zipCode ?? ''}
              onChange={(e) => updateField('zipCode', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="28001"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
            <input
              type="text"
              value={profile?.city ?? ''}
              onChange={(e) => updateField('city', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="Madrid"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
            <input
              type="text"
              value={profile?.country ?? ''}
              onChange={(e) => updateField('country', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="España"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Provincia / Estado</label>
            <input
              type="text"
              value={profile?.stateProvince ?? ''}
              onChange={(e) => updateField('stateProvince', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="Comunidad de Madrid"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
          <input
            type="tel"
            value={profile?.phone ?? ''}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
            placeholder="+34 600 000 000"
          />
        </div>

        {profileMsg && (
          <div className={`text-sm px-3 py-2 rounded-lg ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {profileMsg.text}
          </div>
        )}

          <div className="flex justify-end mt-4">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {/* Section 3: Billing & Plan — always show if subscription loaded */}
        {sub ? (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">Facturación y Plan</h2>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-4 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg border border-indigo-100">
              {sub.subscription.plan.name}
            </span>
            {sub.subscription.plan.priceMonthly > 0 && (
              <span className="text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
                {'$'}{sub.subscription.plan.priceMonthly}/mes
              </span>
            )}
            {sub.subscription.cancelAtPeriodEnd && sub.subscription.stripeCurrentPeriodEnd && (
              <span className="text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
                Se cancela el {new Date(sub.subscription.stripeCurrentPeriodEnd).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>

            {/* Usage bars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Aplicaciones</p>
                <p className="text-xl font-extrabold text-gray-900">
                  {sub.usage.appsCount} <span className="text-sm font-medium text-gray-400">/ {sub.subscription.plan.maxApps} limit</span>
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Builds / mes</p>
                <p className="text-xl font-extrabold text-gray-900">
                  {sub.usage.buildsThisMonth} <span className="text-sm font-medium text-gray-400">/ {sub.subscription.plan.maxBuildsPerMonth} limit</span>
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Almacenamiento</p>
                <p className="text-xl font-extrabold text-gray-900">
                  {(sub.usage.storageBytes / 1024 / 1024).toFixed(1)} <span className="text-sm font-medium text-gray-400">MB / {sub.subscription.plan.storageGb} GB</span>
                </p>
              </div>
            </div>

          {billingMsg && (
            <div className={`text-sm px-3 py-2 rounded-lg ${billingMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {billingMsg.text}
            </div>
          )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/pricing"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200"
              >
                {sub.subscription.plan.planType === 'FREE' ? 'Ver todos los planes' : 'Cambiar de plan'}
              </Link>

              {sub.subscription.stripeSubscriptionId && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        const { url } = await createPortalSession(token!);
                        window.location.href = url;
                      } catch {
                        setBillingMsg({ type: 'error', text: 'Error al abrir portal.' });
                      }
                    }}
                    className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 text-sm font-semibold rounded-xl transition-all"
                  >
                    Portal de facturación (Stripe)
                  </button>

                  {!sub.subscription.cancelAtPeriodEnd && (
                    <button
                      onClick={async () => {
                        if (!confirm('¿Seguro que quieres cancelar tu suscripción? Tu plan permanecerá activo hasta el final del período actual.')) return;
                        setCancelling(true);
                        setBillingMsg(null);
                        try {
                          await cancelStripeSubscription(token!);
                          setSub((prev) => prev ? {
                            ...prev,
                            subscription: { ...prev.subscription, cancelAtPeriodEnd: true },
                          } : prev);
                          setBillingMsg({ type: 'success', text: 'Suscripción cancelada. Tu plan permanecerá activo hasta el final del período.' });
                        } catch (err) {
                          setBillingMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al cancelar.' });
                        } finally {
                          setCancelling(false);
                        }
                      }}
                      disabled={cancelling}
                      className="px-5 py-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 ml-auto"
                    >
                      {cancelling ? 'Procesando...' : 'Cancelar suscripción'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : !loading ? (
          <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Facturación y Plan</h2>
            <p className="text-sm font-medium text-gray-500">Actualmente no estás suscrito a ningún plan de pago.</p>
            <Link
              to="/pricing"
              className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200"
            >
              Explorar planes
            </Link>
          </div>
        ) : null}
      </div>

      {/* Derecha (Columna lateral 1/3) */}
      <div className="space-y-8">
        
        {/* Section 2: Change Password (Moved from bottom) */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 space-y-5">
          <h2 className="text-lg font-bold text-gray-900">Seguridad</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all"
                placeholder="Repetir contraseña"
              />
            </div>
          </div>

          {passwordMsg && (
            <div className={`text-sm px-4 py-3 rounded-xl font-medium ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {passwordMsg.text}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full px-5 py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {changingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </div>

        {/* Section 4: Danger Zone */}
        <div className="bg-red-50/50 rounded-[24px] border border-red-100 p-8 space-y-4">
          <h2 className="text-lg font-bold text-red-700">Zona de Peligro</h2>

        {isSuperAdmin ? (
          <div>
            <p className="text-sm text-gray-500">Las cuentas de administrador no pueden ser eliminadas.</p>
            <button
              disabled
              className="mt-3 px-5 py-2 bg-gray-200 text-gray-400 text-sm font-medium rounded-xl cursor-not-allowed"
            >
              Solicitar eliminación de cuenta
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500">
              Al solicitar la eliminación, tu cuenta será desactivada inmediatamente y no podrás iniciar sesión.
              El administrador procesará la eliminación definitiva de tus datos.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-3 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Solicitar eliminación de cuenta
              </button>
            ) : (
              <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                <p className="text-sm text-red-700 font-medium">
                  Confirma tu contraseña para proceder con la solicitud de eliminación.
                </p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  placeholder="Tu contraseña actual"
                />
                {deleteMsg && (
                  <div className="text-sm px-3 py-2 rounded-lg bg-red-50 text-red-600">
                    {deleteMsg.text}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteMsg(null); }}
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRequestDeletion}
                    disabled={deleting || !deletePassword}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {deleting ? 'Procesando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
    </div>
  );
};
