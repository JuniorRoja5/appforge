import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { getNewsAdmin, type NewsArticle } from '../lib/api';
import { formatDate } from '../lib/coupon-helpers';
import { DataAdminShell } from '../components/admin/DataAdminShell';
import { WorkflowInbox } from '../components/admin/WorkflowInbox';

// Strip de tags HTML del editor quill para mostrar el cuerpo como texto plano
// en la fila admin. Sin dangerouslySetInnerHTML — la fila es para escanear
// "¿qué publiqué?", no para preview rica (esa vive en el editor del módulo y
// en el runtime PWA con DOMPurify, ver #70). Al no renderizar HTML aquí, el
// self-XSS aceptado del builder ni siquiera entra en juego en esta pantalla.
const stripTags = (html: string): string =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const ArticleRow: FC<{ article: NewsArticle }> = ({ article }) => {
  // content puede ser '' o '<p></p>' tras el strip — guard para no dejar
  // un hueco fantasma debajo del título cuando no hay cuerpo real.
  const preview = stripTags(article.content);
  return (
    <div className="p-4 flex items-start gap-4">
      <Newspaper size={16} className="text-gray-400 shrink-0 mt-1" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {article.title}
        </p>
        {preview && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{preview}</p>
        )}
      </div>
      <div className="text-xs text-gray-400 shrink-0 w-32 text-right">
        {formatDate(article.publishedAt)}
      </div>
    </div>
  );
};

export const NewsAdminPage: FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId || !token) return;
    setInitialLoading(true);
    setError(null);

    getNewsAdmin(appId, token)
      .then(setArticles)
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar el listado de artículos.',
        );
        // Rastro adicional en consola con prefijo (gate 1). El banner del
        // Shell ya lo muestra al usuario; este log es para debugging.
        // eslint-disable-next-line no-console
        console.error('[NewsAdminPage] fetch failed:', err);
      })
      .finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token]);

  if (!appId || !token) return null;

  return (
    <DataAdminShell
      title="Artículos"
      description="Revisa los artículos publicados en la app. Para crear o editar, abre el módulo Noticias en el editor."
      backHref={`/apps/${appId}/edit`}
      loading={initialLoading}
      error={error}
    >
      {!error && (
        <WorkflowInbox<NewsArticle>
          items={articles}
          getItemId={(a) => a.id}
          renderRow={(a) => <ArticleRow article={a} />}
          emptyMessage="Aún no has publicado ningún artículo."
        />
      )}
    </DataAdminShell>
  );
};
