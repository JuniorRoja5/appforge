import sanitize from 'sanitize-html';

/**
 * Sanitize user-provided HTML content (e.g. from Quill editor).
 * Strips dangerous tags/attributes while preserving rich-text formatting.
 */
export function sanitizeHtmlContent(dirty: string): string {
  return sanitize(dirty, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img',
      'blockquote', 'pre', 'code',
      'span', 'div', 'sub', 'sup',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
      '*': ['class', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
