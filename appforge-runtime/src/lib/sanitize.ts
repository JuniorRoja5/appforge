import DOMPurify from 'dompurify';

/** Sanitize HTML before rendering via dangerouslySetInnerHTML. */
export const sanitize = (html: string): string => DOMPurify.sanitize(html);
