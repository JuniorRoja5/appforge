import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML antes de renderizarlo via dangerouslySetInnerHTML.
 * Clon exacto de appforge-runtime/src/lib/sanitize.ts — misma función,
 * mismo paquete DOMPurify. Existe aquí porque la página pública
 * AppUserPrivacyPage vive en el builder SPA (no en runtime) y necesita
 * sanitizar el HTML del cliente antes de mostrarlo.
 */
export const sanitize = (html: string): string => DOMPurify.sanitize(html);
