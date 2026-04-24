import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { resolveAssetUrl } from '../lib/resolve-asset-url';
import {
  getAppUsers,
  getAppUserStats,
  getAppUserDetail,
  banAppUser,
  unbanAppUser,
  deleteAppUser,
  resetAppUserPassword,
  exportAppUsersCsv,
  type PaginatedAppUsers,
  type AppUserDetail,
} from '../lib/api';
import {
  Search, Download, ShieldOff, ShieldCheck, Trash2, KeyRound, X,
  Loader2, Users, UserCheck, UserX, ChevronLeft, ChevronRight,
  MessageSquare, Heart, Image, Flag,
} from 'lucide-react';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-ES');
}

// ─── User Detail Panel ──────────────────────────────────────

const UserDetailPanel: React.FC<{
  appId: string;
  userId: string;
  token: string;
  onClose: () => void;
  onUserChanged: () => void;
}> = ({ appId, userId, token, onClose, onUserChanged }) => {
  const [detail, setDetail] = useState<AppUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetResult, setResetResult] = useState<{ token: string; expiresAt: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    getAppUserDetail(appId, userId, token)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [appId, userId, token]);

  const handleBan = async () => {
    if (!detail) return;
    try {
      if (detail.status === 'ACTIVE') await banAppUser(appId, userId, token);
      else await unbanAppUser(appId, userId, token);
      onUserChanged();
      const fresh = await getAppUserDetail(appId, userId, token);
      setDetail(fresh);
    } catch { /* ignore */ }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este usuario permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      await deleteAppUser(appId, userId, token);
      onUserChanged();
      onClose();
    } catch { /* ignore */ }
  };

  const handleResetPassword = async () => {
    try {
      const result = await resetAppUserPassword(appId, userId, token);
      setResetResult({ token: result.resetToken, expiresAt: result.expiresAt });
    } catch { /* ignore */ }
  };

  const displayName = detail
    ? (detail.firstName || detail.lastName
        ? `${detail.firstName ?? ''} ${detail.lastName ?? ''}`.trim()
        : detail.email.split('@')[0])
    : '';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-gray-900">Detalle de usuario</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : detail ? (
          <div className="p-6 space-y-6">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg shrink-0 overflow-hidden">
                {detail.avatarUrl ? (
                  <img src={resolveAssetUrl(detail.avatarUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  displayName[0]?.toUpperCase() ?? '?'
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{detail.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    detail.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {detail.status === 'ACTIVE' ? 'Activo' : 'Bloqueado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500">Registrado</p>
                <p className="text-xs font-medium text-gray-800">{new Date(detail.createdAt).toLocaleDateString('es-ES')}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500">Último login</p>
                <p className="text-xs font-medium text-gray-800">{timeAgo(detail.lastLoginAt)}</p>
              </div>
            </div>

            {/* Activity */}
            <div>
              <h3 className="text-xs font-bold text-gray-700 mb-2">Actividad</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: MessageSquare, label: 'Posts', value: detail.activity.socialPosts + detail.activity.fanPosts },
                  { icon: MessageSquare, label: 'Comentarios', value: detail.activity.socialComments },
                  { icon: Heart, label: 'Likes', value: detail.activity.socialLikes + detail.activity.fanLikes },
                  { icon: Image, label: 'Fotos', value: detail.activity.fanPosts },
                  { icon: Flag, label: 'Reportes', value: detail.activity.reports },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                    <Icon size={12} className="text-gray-400 mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-gray-800">{value}</p>
                    <p className="text-[9px] text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent posts */}
            {(detail.recentPosts.socialPosts.length > 0 || detail.recentPosts.fanPosts.length > 0) && (
              <div>
                <h3 className="text-xs font-bold text-gray-700 mb-2">Posts recientes</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detail.recentPosts.socialPosts.map((p) => (
                    <div key={p.id} className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-600 line-clamp-2">{p.content}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                        <span><Heart size={9} className="inline" /> {p.likesCount}</span>
                        <span>{new Date(p.createdAt).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                  ))}
                  {detail.recentPosts.fanPosts.map((p) => (
                    <div key={p.id} className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
                      <img src={resolveAssetUrl(p.imageUrl)} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 line-clamp-1">{p.caption ?? 'Foto'}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                          <span><Heart size={9} className="inline" /> {p.likesCount}</span>
                          <span>{new Date(p.createdAt).toLocaleDateString('es-ES')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reset password result */}
            {resetResult && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 mb-1">Token de reset generado</p>
                <p className="text-2xl font-mono font-bold text-blue-900 tracking-widest text-center my-2">
                  {resetResult.token}
                </p>
                <p className="text-[10px] text-blue-600">
                  Comunica este código al usuario. Expira: {new Date(resetResult.expiresAt).toLocaleString('es-ES')}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <button
                onClick={handleBan}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  detail.status === 'ACTIVE'
                    ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                {detail.status === 'ACTIVE' ? (
                  <><ShieldOff size={16} /> Bloquear usuario</>
                ) : (
                  <><ShieldCheck size={16} /> Desbloquear usuario</>
                )}
              </button>
              <button
                onClick={handleResetPassword}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <KeyRound size={16} /> Reset contraseña
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={16} /> Eliminar usuario
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center py-20 text-gray-400 text-sm">Error al cargar</p>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────

export const AppUsersPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);
  const [usersData, setUsersData] = useState<PaginatedAppUsers | null>(null);
  const [stats, setStats] = useState<{ total: number; active: number; banned: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadData = useCallback(
    async (p: number, s?: string) => {
      if (!appId || !token) return;
      setLoading(true);
      try {
        const [users, st] = await Promise.all([
          getAppUsers(appId, token, {
            search: s ?? (search || undefined),
            status: statusFilter || undefined,
            page: p,
            limit: 20,
          }),
          getAppUserStats(appId, token),
        ]);
        setUsersData(users);
        setStats(st);
        setPage(p);
      } catch { /* ignore */ }
      setLoading(false);
    },
    [appId, token, search, statusFilter],
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadData(1, value);
    }, 300);
  };

  const handleExport = async () => {
    if (!appId || !token) return;
    try {
      const blob = await exportAppUsersCsv(appId, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usuarios-${appId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const handleQuickAction = async (userId: string, action: 'ban' | 'unban' | 'delete') => {
    if (!appId || !token) return;
    if (action === 'delete' && !confirm('¿Eliminar este usuario permanentemente?')) return;
    try {
      if (action === 'ban') await banAppUser(appId, userId, token);
      else if (action === 'unban') await unbanAppUser(appId, userId, token);
      else await deleteAppUser(appId, userId, token);
      loadData(page);
    } catch { /* ignore */ }
  };

  if (!appId) return null;

  const totalPages = usersData ? Math.ceil(usersData.total / usersData.limit) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuarios de la App</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona los usuarios que se registran en tu app</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'blue' },
            { label: 'Activos', value: stats.active, icon: UserCheck, color: 'green' },
            { label: 'Bloqueados', value: stats.banned, icon: UserX, color: 'red' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-[20px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-${color}-50 flex items-center justify-center text-${color}-500 shrink-0`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por email o nombre..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); }}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-purple-300"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="BANNED">Bloqueados</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading && !usersData ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : !usersData || usersData.data.length === 0 ? (
          <div className="text-center py-16">
            <Users size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {search || statusFilter ? 'No se encontraron usuarios con estos filtros' : 'Aún no hay usuarios registrados'}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3.5 text-xs font-medium text-gray-500">Usuario</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-gray-500">Estado</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-gray-500">Último login</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-gray-500">Registrado</th>
                  <th className="px-6 py-3.5 text-xs font-medium text-gray-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usersData.data.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold shrink-0 overflow-hidden">
                          {user.avatarUrl ? (
                            <img src={resolveAssetUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (user.firstName?.[0] ?? user.email[0]).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.firstName || user.lastName
                              ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                              : user.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        user.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {user.status === 'ACTIVE' ? 'Activo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">{timeAgo(user.lastLoginAt)}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {user.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleQuickAction(user.id, 'ban')}
                            className="p-1.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Bloquear"
                          >
                            <ShieldOff size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleQuickAction(user.id, 'unban')}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                            title="Desbloquear"
                          >
                            <ShieldCheck size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleQuickAction(user.id, 'delete')}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {usersData.total} usuarios · Página {page} de {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => loadData(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) {
                      p = i + 1;
                    } else if (page <= 3) {
                      p = i + 1;
                    } else if (page >= totalPages - 2) {
                      p = totalPages - 4 + i;
                    } else {
                      p = page - 2 + i;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => loadData(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          p === page
                            ? 'bg-purple-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => loadData(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail slide-over */}
      {selectedUserId && (
        <UserDetailPanel
          appId={appId}
          userId={selectedUserId}
          token={token!}
          onClose={() => setSelectedUserId(null)}
          onUserChanged={() => loadData(page)}
        />
      )}
    </div>
  );
};
