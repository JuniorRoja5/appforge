import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import {
  getContactSubmissions,
  deleteContactSubmission,
  type ContactSubmission,
} from '../lib/api';
import { DataAdminShell } from '../components/admin/DataAdminShell';
import { WorkflowInbox } from '../components/admin/WorkflowInbox';
import type { RowAction } from '../components/admin/types';

/**
 * Formatea un valor del JSON `data` de un ContactSubmission con gracia.
 * Hoy el runtime guarda strings (todos los tipos de FormField devuelven
 * strings — los archivos van en fileUrls, no en data), pero `data: Json`
 * en Prisma es opaco y `Record<string, unknown>` en TypeScript es honesto:
 * versiones legacy, futuros tipos (multi-select, fechas, números), o
 * testing manual podrían meter arrays/objetos/null/numbers. Tratamos cada
 * valor según su typeof para no pintar "[object Object]" en pantalla.
 */
const formatValue = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
};

const buildRowActions = (
  appId: string,
  token: string,
  refetch: () => Promise<void>,
): RowAction<ContactSubmission>[] => [
  {
    id: 'delete',
    label: 'Eliminar mensaje',
    icon: <Trash2 size={16} />,
    variant: 'destructive',
    confirm: {
      title: '¿Eliminar este mensaje?',
      description:
        'El mensaje se eliminará permanentemente. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Mantener',
      variant: 'destructive',
    },
    onClick: async (sub) => {
      await deleteContactSubmission(appId, sub.id, token);
      await refetch();
    },
  },
];

const SubmissionRow: FC<{
  submission: ContactSubmission;
  expanded: boolean;
  onToggle: () => void;
  actions: ReactNode;
}> = ({ submission, expanded, onToggle, actions }) => {
  const entries = Object.entries(submission.data as Record<string, unknown>);
  const preview = entries
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${formatValue(v)}`)
    .join(' | ');

  return (
    <div className="overflow-hidden">
      <div
        className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-400">
            {new Date(submission.createdAt).toLocaleString('es-ES')}
          </div>
          <div className="text-sm text-gray-700 truncate mt-0.5">{preview}</div>
        </div>
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
          {expanded ? (
            <EyeOff size={16} className="text-gray-400" />
          ) : (
            <Eye size={16} className="text-gray-400" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t px-3 py-2 bg-gray-50 space-y-1">
          {entries.map(([key, val]) => (
            <div key={key} className="text-xs">
              <span className="font-medium text-gray-600">{key}:</span>{' '}
              <span className="text-gray-800">{formatValue(val)}</span>
            </div>
          ))}
          {submission.fileUrls.length > 0 && (
            <div className="text-xs mt-1">
              <span className="font-medium text-gray-600">Archivos:</span>
              {submission.fileUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-primary underline"
                >
                  Archivo {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ContactInboxPage: FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);

  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!appId || !token) return;
    setError(null);
    try {
      const subs = await getContactSubmissions(appId, token);
      setSubmissions(subs);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los mensajes.',
      );
    }
  }, [appId, token]);

  useEffect(() => {
    if (!appId || !token) return;
    setInitialLoading(true);
    fetchSubmissions().finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token]);

  const rowActions = useMemo(
    () =>
      appId && token ? buildRowActions(appId, token, fetchSubmissions) : [],
    [appId, token, fetchSubmissions],
  );

  return (
    <DataAdminShell
      title="Mensajes de contacto"
      description="Mensajes enviados por los usuarios desde el formulario de contacto de tu app."
      backHref={`/apps/${appId}/edit`}
      loading={initialLoading}
      error={error}
    >
      <WorkflowInbox<ContactSubmission>
        items={submissions}
        getItemId={(s) => s.id}
        emptyMessage="No has recibido ningún mensaje todavía."
        renderRow={(sub, actions) => (
          <SubmissionRow
            submission={sub}
            expanded={expandedId === sub.id}
            onToggle={() =>
              setExpandedId(expandedId === sub.id ? null : sub.id)
            }
            actions={actions}
          />
        )}
        rowActions={rowActions}
        onActionError={(err) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Error al eliminar el mensaje.',
          );
        }}
      />
    </DataAdminShell>
  );
};
