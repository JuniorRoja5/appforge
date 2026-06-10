import { useState } from 'react';
import type { FC, ReactElement, ReactNode } from 'react';
import { Trash2, CheckCircle, Loader2, Flag, Inbox } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import type { ConfirmConfig } from './types';

/**
 * Contenido del item reportado, enriquecido server-side por getReports en
 * 1.3c-api. Forma polimórfica que sirve a los tres tipos canónicos:
 *   - social_post  → text (content) + imageUrl opcional + authorEmail
 *   - social_comment → text (content) + authorEmail  [sin imageUrl]
 *   - fan_post     → text (caption) opcional + imageUrl (req) + authorEmail
 *
 * El render por defecto distingue tres estados:
 *   - undefined  → el consumidor NO pasa el campo; no se pinta el bloque
 *                  (retro-compat con módulos que no enriquezcan).
 *   - null       → el contenido ya no existe (huérfano: borrado en cascada,
 *                  o anti-fuga server-side rechazó pertenencia al app).
 *                  Se pinta "Contenido eliminado".
 *   - objeto     → se pinta miniatura (si imageUrl) + text (line-clamp-2) +
 *                  email del autor del contenido.
 */
export interface ReportedContent {
  text?: string;
  imageUrl?: string;
  authorEmail: string;
}

export interface BaseReportShape {
  reason?: string | null;
  appUser: { email: string };
  targetType: string;
  reportedContent?: ReportedContent | null;
}

export interface PostActions {
  deleteButton: ReactNode;
}

export interface ReportActions {
  resolveButton: ReactNode;
  deleteContentButton: ReactNode;
}

export type ModerationActionId =
  | 'deletePost'
  | 'resolveReport'
  | 'deleteReportedContent';

export interface ModerationQueueProps<
  TPost,
  TReport extends BaseReportShape = BaseReportShape
> {
  // --- Reportes (sección superior) ---
  reports: TReport[];
  getReportId: (report: TReport) => string;
  renderReportRow?: (report: TReport, actions: ReportActions) => ReactNode;
  getReportTypeLabel?: (report: TReport) => string;

  // --- Posts (sección inferior) ---
  posts: TPost[];
  postsTotal: number;
  getPostId: (post: TPost) => string;
  renderPostCell: (post: TPost, actions: PostActions) => ReactNode;
  postsLayout: 'list' | 'grid';
  postsLoading?: boolean;
  loadMore?: () => void;

  // --- Acciones (cada una recibe la entidad entera, no un id) ---
  onDeletePost: (post: TPost) => Promise<void>;
  onResolveReport: (report: TReport) => Promise<void>;
  onDeleteReportedContent: (report: TReport) => Promise<void>;

  // --- Confirmaciones (defaults razonables si se omiten) ---
  confirmDeletePost?: ConfirmConfig;
  confirmDeleteReportedContent?: ConfirmConfig;
  // resolveReport no pide confirmación (no destructivo)

  // --- Etiquetas de UI (defaults en español) ---
  postsTitle?: string;
  reportsTitle?: string;
  emptyPostsLabel?: string;
  emptyReportsLabel?: string;

  // --- Error handler opcional. Default: console.error ruidoso. ---
  onActionError?: (
    error: unknown,
    action: ModerationActionId,
    entity: TPost | TReport,
  ) => void;
}

const defaultDeletePostConfig: ConfirmConfig = {
  title: '¿Eliminar este contenido?',
  description:
    'El contenido se eliminará permanentemente y dejará de estar visible para los usuarios de la app. Esta acción no se puede deshacer.',
  variant: 'destructive',
};

const defaultDeleteReportedContentConfig: ConfirmConfig = {
  title: '¿Eliminar el contenido reportado?',
  description:
    'El contenido referenciado por el reporte se eliminará permanentemente. El reporte quedará marcado como resuelto.',
  variant: 'destructive',
};

const defaultReportTypeLabel = (r: BaseReportShape): string =>
  `${r.targetType.replace(/_/g, ' ')} reportado`;

/**
 * Sub-componente del render por defecto. Vive fuera del genérico
 * ModerationQueue para que su useState (imageError) no se recree en cada
 * render del padre. Solo depende de BaseReportShape — los consumidores que
 * extienden TReport pasan instancias que TS acepta por covarianza.
 *
 * Maneja los tres estados de reportedContent + el caso de imageUrl rota:
 *   - imageUrl + onError + hay text  → oculta img, deja el text como contexto
 *   - imageUrl + onError + sin text  → placeholder "Imagen no disponible"
 *     (sin esto, el bloque saldría vacío en caso de fan_post sin caption
 *     con imagen rota — el moderador no sabría que hay contenido)
 */
const DefaultReportRow: FC<{
  report: BaseReportShape;
  actions: ReportActions;
  typeLabel: string;
}> = ({ report, actions, typeLabel }) => {
  const [imageError, setImageError] = useState(false);
  const rc = report.reportedContent;

  return (
    <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
            <Flag size={12} className="text-orange-500" />
            {typeLabel}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Por: {report.appUser.email}
          </p>
          {report.reason && (
            <p className="text-xs text-gray-500 mt-0.5 italic">
              &ldquo;{report.reason}&rdquo;
            </p>
          )}
          {/* Bloque de contenido reportado — solo si el consumidor pasa el
              campo (undefined = retro-compat, no se pinta). Borde
              orange-200 un paso más oscuro que el card padre para que el
              bloque se lea como unidad embebida. */}
          {rc !== undefined && (
            <div className="bg-white border border-orange-200 rounded p-2 mt-2">
              {rc === null ? (
                <p className="text-xs text-gray-400 italic">
                  Contenido eliminado
                </p>
              ) : (
                <div className="flex items-start gap-2">
                  {rc.imageUrl && !imageError && (
                    <img
                      src={resolveAssetUrl(rc.imageUrl)}
                      alt=""
                      className="w-12 h-12 rounded object-cover shrink-0"
                      onError={() => setImageError(true)}
                    />
                  )}
                  {rc.imageUrl && imageError && !rc.text && (
                    <div className="w-12 h-12 rounded bg-gray-100 shrink-0 flex items-center justify-center text-[9px] text-gray-400 text-center px-1 leading-tight">
                      Imagen no disponible
                    </div>
                  )}
                  {/* min-w-0 obligatorio en flex children que contienen
                      line-clamp/truncate — sin esto el texto largo empuja
                      el layout en vez de truncarse. */}
                  <div className="min-w-0 flex-1">
                    {rc.text && (
                      <p className="text-xs text-gray-700 line-clamp-2">
                        {rc.text}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Autor: {rc.authorEmail}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {actions.deleteContentButton}
          {actions.resolveButton}
        </div>
      </div>
    </div>
  );
};

export function ModerationQueue<
  TPost,
  TReport extends BaseReportShape = BaseReportShape,
>({
  reports,
  getReportId,
  renderReportRow,
  getReportTypeLabel,
  posts,
  postsTotal,
  getPostId,
  renderPostCell,
  postsLayout,
  postsLoading,
  loadMore,
  onDeletePost,
  onResolveReport,
  onDeleteReportedContent,
  confirmDeletePost,
  confirmDeleteReportedContent,
  postsTitle = 'Contenido',
  reportsTitle = 'Reportes',
  emptyPostsLabel = 'Sin contenido aún',
  emptyReportsLabel = 'Sin reportes pendientes',
  onActionError,
}: ModerationQueueProps<TPost, TReport>): ReactElement {
  const { confirm, dialog } = useConfirm();
  const [runningPost, setRunningPost] = useState<Set<string>>(new Set());
  const [runningReport, setRunningReport] = useState<
    Map<string, 'resolve' | 'deleteContent'>
  >(new Map());

  const reportError = (
    err: unknown,
    action: ModerationActionId,
    entity: TPost | TReport,
  ) => {
    if (onActionError) {
      onActionError(err, action, entity);
    } else {
      // Default no-silencio: emitir error visible en consola con prefijo
      // explícito. Las páginas deberían pasar onActionError para mostrar
      // el error en el banner del Shell; este fallback NO se traga el error.
      // eslint-disable-next-line no-console
      console.error(`[ModerationQueue] Action "${action}" failed:`, err);
    }
  };

  const doDeletePost = async (post: TPost) => {
    const cfg = confirmDeletePost ?? defaultDeletePostConfig;
    const ok = await confirm({ ...cfg, variant: cfg.variant ?? 'destructive' });
    if (!ok) return;
    const id = getPostId(post);
    setRunningPost((s) => new Set(s).add(id));
    try {
      await onDeletePost(post);
    } catch (err) {
      reportError(err, 'deletePost', post);
    } finally {
      setRunningPost((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  const doResolveReport = async (report: TReport) => {
    const id = getReportId(report);
    setRunningReport((m) => {
      const next = new Map(m);
      next.set(id, 'resolve');
      return next;
    });
    try {
      await onResolveReport(report);
    } catch (err) {
      reportError(err, 'resolveReport', report);
    } finally {
      setRunningReport((m) => {
        const next = new Map(m);
        next.delete(id);
        return next;
      });
    }
  };

  const doDeleteReportedContent = async (report: TReport) => {
    const cfg =
      confirmDeleteReportedContent ?? defaultDeleteReportedContentConfig;
    const ok = await confirm({ ...cfg, variant: cfg.variant ?? 'destructive' });
    if (!ok) return;
    const id = getReportId(report);
    setRunningReport((m) => {
      const next = new Map(m);
      next.set(id, 'deleteContent');
      return next;
    });
    try {
      await onDeleteReportedContent(report);
    } catch (err) {
      reportError(err, 'deleteReportedContent', report);
    } finally {
      setRunningReport((m) => {
        const next = new Map(m);
        next.delete(id);
        return next;
      });
    }
  };

  const buildPostActions = (post: TPost): PostActions => {
    const id = getPostId(post);
    const busy = runningPost.has(id);
    return {
      deleteButton: (
        <button
          type="button"
          title="Eliminar"
          aria-label="Eliminar"
          disabled={busy}
          onClick={() => doDeletePost(post)}
          className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      ),
    };
  };

  const buildReportActions = (report: TReport): ReportActions => {
    const id = getReportId(report);
    const action = runningReport.get(id);
    const busy = action !== undefined;
    return {
      deleteContentButton: (
        <button
          type="button"
          title="Eliminar contenido reportado"
          aria-label="Eliminar contenido reportado"
          disabled={busy}
          onClick={() => doDeleteReportedContent(report)}
          className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {action === 'deleteContent' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      ),
      resolveButton: (
        <button
          type="button"
          title="Resolver reporte"
          aria-label="Resolver reporte"
          disabled={busy}
          onClick={() => doResolveReport(report)}
          className="p-1.5 rounded text-gray-500 hover:text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {action === 'resolve' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle size={14} />
          )}
        </button>
      ),
    };
  };

  const renderDefaultReportRow = (
    report: TReport,
    actions: ReportActions,
  ): ReactNode => {
    const typeLabel = (getReportTypeLabel ?? defaultReportTypeLabel)(report);
    return (
      <DefaultReportRow
        report={report}
        actions={actions}
        typeLabel={typeLabel}
      />
    );
  };

  const reportRowRenderer = renderReportRow ?? renderDefaultReportRow;

  const postsContainerCls =
    postsLayout === 'grid'
      ? 'grid grid-cols-3 gap-2'
      : 'space-y-2';

  return (
    <div className="space-y-8">
      {/* --- SECCIÓN REPORTES (arriba, prioridad de atención) --- */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            {reportsTitle}
          </h2>
          {reports.length > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {reports.length}
            </span>
          )}
        </div>
        {reports.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
            {emptyReportsLabel}
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={getReportId(r)}>
                {reportRowRenderer(r, buildReportActions(r))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- SECCIÓN CONTENIDO (abajo) --- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            {postsTitle}
          </h2>
          <span className="text-xs text-gray-400">
            {posts.length} de {postsTotal}
          </span>
        </div>
        {postsLoading && posts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <Inbox className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-sm text-gray-500">{emptyPostsLabel}</p>
          </div>
        ) : (
          <>
            <div className={postsContainerCls}>
              {posts.map((p) => (
                <div key={getPostId(p)}>
                  {renderPostCell(p, buildPostActions(p))}
                </div>
              ))}
            </div>
            {loadMore && posts.length < postsTotal && (
              <button
                type="button"
                onClick={loadMore}
                disabled={postsLoading}
                className="w-full mt-3 py-2 text-sm text-primary hover:opacity-80 font-medium disabled:opacity-50"
              >
                {postsLoading ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : (
                  'Cargar más'
                )}
              </button>
            )}
          </>
        )}
      </section>

      {dialog}
    </div>
  );
}
