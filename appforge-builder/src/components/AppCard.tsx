import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveAssetUrl } from '../lib/resolve-asset-url';

interface AppData {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'BUILDING';
  hasKeystore?: boolean;
  createdAt: string;
  updatedAt: string;
  appConfig?: Record<string, any> | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Borrador', className: 'bg-gray-100 text-gray-600' },
  PUBLISHED: { label: 'Publicada', className: 'bg-green-100 text-green-700' },
  BUILDING: { label: 'Compilando', className: 'bg-yellow-100 text-yellow-700' },
};

interface AppCardProps {
  app: AppData;
  onDelete: (appId: string) => void;
}

export const AppCard: React.FC<AppCardProps> = ({ app, onDelete }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const status = statusConfig[app.status] || statusConfig.DRAFT;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 hover:border-blue-200/50 transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
      {/* Settings Dots (Top Right) */}
      <div className="absolute top-3 right-3 z-10">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="w-8 h-8 rounded-full bg-white/50 backdrop-blur-md flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white shadow-sm transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 py-1.5 z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => { setMenuOpen(false); navigate(`/apps/${app.id}/edit`); }}
                    className="w-full text-left px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    <span>Abrir Constructor</span>
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); navigate(`/apps/${app.id}/settings`); }}
                    className="w-full text-left px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span>Configuración</span>
                  </button>
                  <hr className="my-1.5 border-gray-100" />
                  <button
                    onClick={() => { setMenuOpen(false); setShowDeleteModal(true); }}
                    className="w-full text-left px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    <span>Eliminar</span>
                  </button>
                </div>
              </>
            )}
        </div>
      </div>

      {/* Preview area */}
      <div
        className="h-[160px] bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] flex items-center justify-center cursor-pointer border-b border-gray-100 group-hover:from-blue-50/50 group-hover:to-indigo-50/50 transition-colors"
        onClick={() => navigate(`/apps/${app.id}/edit`)}
      >
        {app.appConfig?.icon?.url ? (
          <img
            src={resolveAssetUrl(app.appConfig.icon.url)}
            alt={app.name}
            className="w-[72px] h-[72px] rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-300 ring-4 ring-white"
          />
        ) : (
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300 ring-4 ring-white">
            {app.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <h3
          className="text-base font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => navigate(`/apps/${app.id}/edit`)}
        >
          {app.name}
        </h3>
        <p className="text-[13px] text-gray-500 mt-1 mb-4 flex-1">Actualizado el {formatDate(app.updatedAt)}</p>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${status.className}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.className.includes('green') ? 'bg-green-500' : status.className.includes('yellow') ? 'bg-yellow-500' : 'bg-gray-400'}`}></span>
            {status.label}
          </span>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowDeleteModal(false); setDeleteConfirmed(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] max-w-[90vw] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">Eliminar "{app.name}"</h3>
                <p className="text-[12px] text-gray-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="space-y-2 bg-red-50 rounded-lg p-3">
              {app.hasKeystore ? (
                <>
                  <p className="text-[12px] text-red-900">
                    Esta app tiene un <strong>keystore vinculado</strong> para actualizar
                    su firma en Play Store / App Store. Al borrarla:
                  </p>
                  <ul className="text-[12px] text-red-800 list-disc pl-4 space-y-1">
                    <li>El slot <strong>seguirá ocupado</strong> en tu plan (la identidad de firma se preserva).</li>
                    <li>Los bytes de los artifacts <strong>se liberan</strong> del storage.</li>
                    <li>Los archivos del keystore se conservan para futuras restauraciones.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-[12px] text-red-900">
                    Esta app no tiene firma de stores asociada. Al borrarla:
                  </p>
                  <ul className="text-[12px] text-red-800 list-disc pl-4 space-y-1">
                    <li>El slot del plan <strong>se libera</strong>.</li>
                    <li>Los bytes de storage <strong>se liberan</strong>.</li>
                  </ul>
                </>
              )}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-[12px] text-gray-700 leading-snug">
                Entiendo las consecuencias y deseo eliminar este proyecto
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmed(false); }}
                className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!deleteConfirmed}
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmed(false); onDelete(app.id); }}
                className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Eliminar proyecto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
