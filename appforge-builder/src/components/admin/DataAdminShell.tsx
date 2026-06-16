import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface DataAdminShellProps {
  title: string;
  description?: string;
  backHref: string;
  backLabel?: string;
  loading?: boolean;
  error?: string | null;
  statsCards?: ReactNode;
  children: ReactNode;
}

export const DataAdminShell: FC<DataAdminShellProps> = ({
  title,
  description,
  backHref,
  backLabel = 'Volver al builder',
  loading,
  error,
  statsCards,
  children,
}) => {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          {backLabel}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {statsCards && <div className="mb-4">{statsCards}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : (
        children
      )}
    </div>
  );
};
