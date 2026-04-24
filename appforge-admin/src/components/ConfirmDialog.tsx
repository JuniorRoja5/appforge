import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<Props> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!open) return null;

  const confirmStyles =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-amber-500 hover:bg-amber-600 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200/60 p-6 max-w-md w-full mx-4">
        <div className="flex items-start space-x-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{message}</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${confirmStyles}`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
