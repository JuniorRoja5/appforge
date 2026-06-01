import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Globe, Copy, Share2, Download, Check, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { getApp, type AppInfo } from '../../lib/api';

// QR rendered at 512x512 raster so the downloaded PNG stays crisp on print;
// CSS scales the display size down to 180px for a compact layout.
const QR_RASTER_PX = 512;
const QR_DISPLAY_PX = 180;

export const PwaContent: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const token = useAuthStore((s) => s.token);
  const [app, setApp] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!appId || !token) return;
    let cancelled = false;
    setLoading(true);
    getApp(appId, token)
      .then((data) => { if (!cancelled) setApp(data); })
      .catch(() => { if (!cancelled) setApp(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appId, token]);

  const handleCopy = async (url: string) => {
    setShareError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError('No pudimos copiar el enlace. Inténtalo de nuevo o cópialo a mano.');
    }
  };

  const handleShare = async (url: string, appName: string) => {
    setShareError(null);
    if (navigator.share) {
      try {
        await navigator.share({
          title: appName,
          text: `Mira la app "${appName}"`,
          url,
        });
      } catch (err) {
        // AbortError = el usuario canceló el diálogo nativo; silenciar.
        if ((err as Error).name !== 'AbortError') {
          setShareError('No pudimos compartir el enlace. Inténtalo de nuevo.');
        }
      }
    } else {
      await handleCopy(url);
    }
  };

  const handleDownloadQR = (slug: string) => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `pwa-${slug}.png`;
    link.href = dataUrl;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-sm text-gray-500">
        No pudimos cargar tu app. Vuelve a intentarlo en un momento.
      </div>
    );
  }

  if (!app.pwaEnabled || !app.pwaUrl) {
    return (
      <div className="max-w-md mx-auto py-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <Globe size={20} className="text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Aún no has publicado tu app como web</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Usa el botón <span className="font-medium text-gray-700">Generar app</span> para publicarla, y aquí aparecerán el enlace y el código QR para compartir con tus clientes.
        </p>
      </div>
    );
  }

  const pwaUrl = app.pwaUrl;
  const formattedDate = app.pwaLastDeployedAt
    ? new Date(app.pwaLastDeployedAt).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {app.needsRebuild && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Tienes cambios sin publicar.</span> Has cambiado tu app desde la última publicación. Tus clientes seguirán viendo la versión anterior hasta que publiques una nueva.
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Enlace de tu app</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={pwaUrl}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 px-3 py-2 text-sm font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <a
            href={pwaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Abrir el enlace en una pestaña nueva"
          >
            <ExternalLink size={16} />
          </a>
        </div>
        {formattedDate && (
          <p className="text-[11px] text-gray-400 mt-1.5">
            Última publicación: {formattedDate}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleCopy(pwaUrl)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <Check size={14} className="text-green-600" />
              <span className="text-green-700">Copiado</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              Copiar enlace
            </>
          )}
        </button>
        <button
          onClick={() => handleShare(pwaUrl, app.name)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Share2 size={14} />
          Compartir
        </button>
      </div>

      {shareError && (
        <div className="text-xs text-red-600">{shareError}</div>
      )}

      <div className="border-t border-gray-100 pt-5">
        <label className="block text-xs font-medium text-gray-500 mb-3">Código QR</label>
        <div className="flex items-start gap-5">
          <div className="p-3 bg-white border border-gray-200 rounded-xl">
            <QRCodeCanvas
              ref={qrRef}
              value={pwaUrl}
              size={QR_RASTER_PX}
              level="M"
              marginSize={0}
              style={{ width: QR_DISPLAY_PX, height: QR_DISPLAY_PX }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs text-gray-600 leading-relaxed">
              Imprime este código y ponlo en tu escaparate, repártelo en folletos o úsalo en redes sociales. Cualquiera que lo escanee con la cámara del móvil abrirá tu app al instante.
            </p>
            <button
              onClick={() => handleDownloadQR(app.slug)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Download size={14} />
              Descargar QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
