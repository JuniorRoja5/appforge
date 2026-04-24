import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { getApp, deleteApp } from '../lib/api';

export const AppSettingsPage: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [app, setApp] = useState<{ id: string; name: string; slug: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!appId || !token) return;
    getApp(appId, token)
      .then((data) => setApp({ id: data.id, name: data.name, slug: data.slug, status: data.status }))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [appId, token, navigate]);

  const handleDelete = async () => {
    if (!appId || !token || !app) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteApp(appId, token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar la app.');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
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

  if (!app) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">{app.name}</p>
      </div>

      {/* General Info */}
      <div className="bg-white rounded-xl border border-gray-200/60 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Información general</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
            <p className="text-sm text-gray-900">{app.name}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
            <p className="text-sm text-gray-600 font-mono">{app.slug}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {app.status}
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="text-sm font-semibold text-red-700 mb-2">Zona de peligro</h2>

        {deleteError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {deleteError}
          </div>
        )}

        {!confirmingDelete ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Eliminar esta app eliminará todos sus datos, módulos, y configuraciones de forma permanente.
            </p>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Eliminar App
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg">
              <p className="text-sm font-semibold text-red-800 mb-1">
                ¿Estás seguro de eliminar "{app.name}"?
              </p>
              <p className="text-xs text-red-600">
                Esta acción no se puede deshacer. Se eliminarán todos los datos asociados.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar permanentemente'}
              </button>
              <button
                onClick={() => { setConfirmingDelete(false); setDeleteError(''); }}
                disabled={deleting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
