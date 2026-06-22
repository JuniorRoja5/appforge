import React from 'react';
import { sanitize } from '../lib/sanitize';
import { responsiveHtmlClass } from '../lib/responsive-html';
import { BrowserShim as Browser } from '../lib/platform';

interface Props {
  /** Contenido HTML inline (renderizado si NO hay url). */
  content?: string;
  /**
   * URL externa a documento legal del cliente. Si está presente, la
   * pantalla muestra un botón "Leer Términos y Condiciones" que abre
   * la URL en el browser nativo (o pestaña nueva en PWA) vía el shim
   * Capacitor-safe — gana sobre el content inline.
   */
  url?: string;
  onAccept: () => void;
}

/**
 * Pantalla de aceptación de Términos y Condiciones del end-user.
 *
 * G2 Commit C — shape { content?, url? } consumido aquí. Dos modos
 * según lo que el reseller haya configurado:
 *   - url presente  → botón externo + botón Aceptar. El usuario lee fuera,
 *                     vuelve, acepta.
 *   - solo content  → HTML sanitizado inline (comportamiento histórico),
 *                     el usuario hace scroll y acepta abajo.
 *
 * El render NUNCA muestra los dos a la vez — url gana porque si el
 * cliente la pegó, es para que esa sea la verdad (no para coexistir
 * con un content semi-vacío como ruido visual).
 *
 * Capacitor-safe: el botón "Leer" usa BrowserShim de lib/platform, que
 * en PWA hace window.open + en native usa @capacitor/browser. Llamar
 * window.open / target="_blank" DIRECTO en runtime es footgun (rompe
 * el WebView Android). El alias `BrowserShim as Browser` deja el
 * call-site Browser.open(...) idéntico al resto del runtime
 * (BookingRuntime, EventsRuntime, etc.) — patrón ya rodado.
 */
export const TermsScreen: React.FC<Props> = ({ content, url, onAccept }) => {
  const handleAccept = () => {
    localStorage.setItem('appforge_terms_accepted', 'true');
    onAccept();
  };

  const handleOpenExternal = async () => {
    if (!url) return;
    try {
      await Browser.open({ url });
    } catch {
      // BrowserShim ya tiene su propio fallback interno (try Capacitor →
      // catch → window.open). Si incluso eso falla, swallow — el usuario
      // puede aceptar sin leer (su responsabilidad legal); no bloqueamos
      // el flujo del app por un browser que no abre.
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      display: 'flex', flexDirection: 'column',
      backgroundColor: 'var(--color-surface-bg, #f9fafb)',
    }}>
      {/* Header — idéntico para los dos modos */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-divider, #e5e7eb)',
        backgroundColor: 'var(--color-surface-card, #fff)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary, #111827)', margin: 0 }}>
          Términos y Condiciones
        </h2>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary, #6b7280)', marginTop: 4 }}>
          Por favor lee y acepta los términos para continuar
        </p>
      </div>

      {/* Body — diverge según url presente o solo content */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 20,
        WebkitOverflowScrolling: 'touch',
      }}>
        {url ? (
          // Modo URL externa — centrado vertical, mensaje + botón.
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', textAlign: 'center', gap: 16,
          }}>
            <p style={{
              fontSize: 14, lineHeight: 1.6,
              color: 'var(--color-text-secondary, #6b7280)',
              maxWidth: 320,
            }}>
              Los términos y condiciones de esta app están publicados en una
              página externa. Léelos antes de continuar:
            </p>
            <button
              onClick={handleOpenExternal}
              style={{
                // C-fix-2: el botón vive en un flex column con
                // align-items: center. Sin flex-shrink: 0, el flex le
                // quita ancho hasta colapsarlo a ~1 carácter (vertical
                // strip invisible). Sin white-space: nowrap, el texto
                // rompe por carácter dentro del ancho colapsado. Las
                // dos defensas juntas garantizan que el botón mantenga
                // su ancho natural (texto + padding) y se vea como botón.
                // El botón "Acepto" de abajo no tiene este problema
                // porque tiene width: 100% en un footer no-flex.
                flexShrink: 0,
                whiteSpace: 'nowrap',
                padding: '12px 20px',
                backgroundColor: 'transparent',
                color: 'var(--color-primary, #4F46E5)',
                border: '2px solid var(--color-primary, #4F46E5)',
                borderRadius: 'var(--radius-button, 12px)',
                fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Leer Términos y Condiciones
            </button>
          </div>
        ) : content ? (
          // Modo content inline — sanitize OBLIGATORIO. El content viene del
          // editor Quill del reseller; sin sanitize, stored-XSS dentro de
          // la PWA/APK.
          <div
            className={responsiveHtmlClass}
            style={{ color: 'var(--color-text-primary, #374151)', fontSize: 13, lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: sanitize(content) }}
          />
        ) : null /* App.tsx guard evita este branch — no debería alcanzarse */}
      </div>

      {/* Accept button — idéntico para los dos modos */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--color-divider, #e5e7eb)',
        backgroundColor: 'var(--color-surface-card, #fff)',
      }}>
        <button
          onClick={handleAccept}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: 'var(--color-primary, #4F46E5)',
            color: 'var(--color-text-on-primary, #fff)',
            borderRadius: 'var(--radius-button, 12px)',
            fontSize: 15, fontWeight: 600,
            border: 'none', cursor: 'pointer',
          }}
        >
          Acepto los Términos y Condiciones
        </button>
      </div>
    </div>
  );
};
