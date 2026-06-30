import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BrowserShim as Browser } from '../../lib/platform';
import { FileText, ExternalLink } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/resolve-asset-url';
import { registerRuntimeModule } from '../registry';
import { ModuleHeader } from '../../components/ModuleHeader';
// Phase 3b (B1) — no inline sub-interfaces to dedupe here. Schema lives in
// appforge-shared/src/module-schemas/pdf_reader.schema.ts and will be
// imported in Phase 3c when safeParse + fallback UX arrives. This is the
// cleanest of the B1 runtimes: no legacy fallbacks, no zombie reads.

const PdfReaderRuntime: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const title = (data.title as string) ?? 'Documento';
  const pdfUrl = (data.pdfUrl as string) ?? '';
  const showTitle = (data.showTitle as boolean) ?? true;
  const fileName = (data.fileName as string) ?? '';
  const [iframeError, setIframeError] = useState(false);

  // Android WebView (Capacitor) does not render <iframe src="*.pdf"> — the user
  // just sees a blank box. iOS WebView is inconsistent. The system browser, on
  // the other hand, has a native PDF viewer on both platforms. So on native we
  // skip the iframe entirely and surface only the "open document" button, which
  // routes through @capacitor/browser. On PWA the iframe still works.
  const isNative = Capacitor.isNativePlatform();
  const showIframe = !isNative && !iframeError;

  const fullUrl = pdfUrl ? resolveAssetUrl(pdfUrl) : '';

  const openExternal = async () => {
    if (!fullUrl) return;
    try {
      await Browser.open({ url: fullUrl });
    } catch {
      window.open(fullUrl, '_blank');
    }
  };

  if (!pdfUrl) {
    return (
      <div className="text-center py-8">
        {showTitle && <ModuleHeader title={title} icon={FileText} />}
        <FileText size={32} className="mx-auto mb-2" style={{ color: 'var(--color-text-secondary)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No hay documento configurado.</p>
      </div>
    );
  }

  return (
    <div>
      {showTitle && <ModuleHeader title={title} icon={FileText} />}

      {/* Embedded PDF viewer (PWA only — native WebView can't render PDFs in iframe) */}
      {showIframe && (
        <div style={{ borderRadius: 'var(--radius-card, 12px)', overflow: 'hidden', border: '1px solid var(--color-divider, #e5e7eb)', marginBottom: 12 }}>
          <iframe
            src={`${fullUrl}#toolbar=1&navpanes=0`}
            className="w-full"
            style={{ height: 400, border: 'none' }}
            onError={() => setIframeError(true)}
          />
        </div>
      )}

      {/* File info bar + open button */}
      <button
        onClick={openExternal}
        className="w-full flex items-center gap-3 p-4"
        style={{
          borderRadius: 'var(--radius-card, 16px)',
          backgroundColor: 'var(--color-surface-card)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-feedback-error, #ef4444)15' }}>
          <FileText size={20} style={{ color: 'var(--color-feedback-error, #ef4444)' }} />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {fileName || 'Abrir documento'}
          </span>
          <span className="block text-xs" style={{ color: 'var(--color-text-secondary)' }}>PDF</span>
        </div>
        <ExternalLink size={16} style={{ color: 'var(--color-text-secondary)' }} />
      </button>
    </div>
  );
};

registerRuntimeModule({ id: 'pdf_reader', Component: PdfReaderRuntime });
