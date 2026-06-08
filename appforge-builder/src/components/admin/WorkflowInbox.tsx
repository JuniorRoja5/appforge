import { useState, useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';
import type {
  RowAction,
  RowActionVariant,
  StatusOption,
  WorkflowInboxPagination,
} from './types';

export interface WorkflowInboxProps<T, S extends string = string> {
  items: T[];
  getItemId: (item: T) => string;
  loading?: boolean;

  statusOptions?: StatusOption<S>[];
  currentStatus?: S;
  onStatusChange?: (status: S) => void;

  pagination?: WorkflowInboxPagination;

  groupBy?: (item: T) => string;
  formatGroupLabel?: (key: string) => string;

  renderRow: (item: T, actions: ReactNode) => ReactNode;

  rowActions?: RowAction<T>[];

  onActionError?: (error: unknown, action: RowAction<T>, item: T) => void;
}

const variantBtnCls: Record<RowActionVariant, string> = {
  default: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
  primary: 'text-gray-500 hover:text-primary hover:bg-primary/10',
  success: 'text-gray-500 hover:text-green-600 hover:bg-green-100',
  warning: 'text-gray-500 hover:text-amber-600 hover:bg-amber-100',
  destructive: 'text-gray-500 hover:text-red-600 hover:bg-red-100',
};

export function WorkflowInbox<T, S extends string = string>({
  items,
  getItemId,
  loading,
  statusOptions,
  currentStatus,
  onStatusChange,
  pagination,
  groupBy,
  formatGroupLabel,
  renderRow,
  rowActions,
  onActionError,
}: WorkflowInboxProps<T, S>): ReactElement {
  const { confirm, dialog } = useConfirm();
  const [running, setRunning] = useState<Map<string, string>>(new Map());

  const runAction = async (action: RowAction<T>, item: T) => {
    if (action.confirm) {
      const ok = await confirm({
        title: action.confirm.title,
        description: action.confirm.description,
        confirmLabel: action.confirm.confirmLabel,
        cancelLabel: action.confirm.cancelLabel,
        variant:
          action.confirm.variant ??
          (action.variant === 'destructive' ? 'destructive' : 'primary'),
      });
      if (!ok) return;
    }
    const itemId = getItemId(item);
    setRunning((m) => {
      const next = new Map(m);
      next.set(itemId, action.id);
      return next;
    });
    try {
      await action.onClick(item);
    } catch (err) {
      if (onActionError) {
        onActionError(err, action, item);
      } else {
        // Default no-silencio: emitir error visible en la consola con prefijo
        // explícito. Las páginas deberían pasar onActionError para mostrar
        // el error en el banner del Shell; este fallback NO se traga el error.
        // eslint-disable-next-line no-console
        console.error(
          `[WorkflowInbox] Action "${action.id}" failed for item ${itemId}:`,
          err,
        );
      }
    } finally {
      setRunning((m) => {
        const next = new Map(m);
        next.delete(itemId);
        return next;
      });
    }
  };

  const groups = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = groupBy(item);
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items, groupBy]);

  const hasActiveFilter =
    statusOptions !== undefined &&
    currentStatus !== undefined &&
    statusOptions[0]?.value !== currentStatus;

  const renderActions = (item: T): ReactNode => {
    if (!rowActions || rowActions.length === 0) return null;
    const itemId = getItemId(item);
    const runningActionId = running.get(itemId);
    const rowIsBusy = runningActionId !== undefined;
    const available = rowActions.filter(
      (a) => !a.isAvailable || a.isAvailable(item),
    );
    if (available.length === 0) return null;
    return (
      <div className="flex items-center gap-1 shrink-0">
        {available.map((a) => {
          const isRunning = runningActionId === a.id;
          const variant = a.variant ?? 'default';
          return (
            <button
              key={a.id}
              type="button"
              title={a.label}
              aria-label={a.label}
              disabled={rowIsBusy}
              onClick={() => runAction(a, item)}
              className={`p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variantBtnCls[variant]}`}
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : a.icon}
            </button>
          );
        })}
      </div>
    );
  };

  const renderItems = (list: T[]): ReactNode => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
      {list.map((item) => (
        <div key={getItemId(item)} className="hover:bg-gray-50">
          {renderRow(item, renderActions(item))}
        </div>
      ))}
    </div>
  );

  const emptyMessage = hasActiveFilter
    ? 'No hay registros con este filtro.'
    : 'Aún no hay registros.';

  return (
    <>
      {statusOptions && statusOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusChange?.(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                currentStatus === opt.value
                  ? 'bg-primary/10 text-primary'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Inbox className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      ) : groups ? (
        <div className="space-y-6">
          {groups.map(([key, list]) => (
            <div key={key}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 capitalize">
                {formatGroupLabel ? formatGroupLabel(key) : key}
              </h3>
              {renderItems(list)}
            </div>
          ))}
        </div>
      ) : (
        renderItems(items)
      )}

      {pagination && pagination.kind === 'page' && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => pagination.onPage(Math.max(1, pagination.page - 1))}
            disabled={pagination.page <= 1}
            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              pagination.onPage(
                Math.min(pagination.totalPages, pagination.page + 1),
              )
            }
            disabled={pagination.page >= pagination.totalPages}
            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Página siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {dialog}
    </>
  );
}
