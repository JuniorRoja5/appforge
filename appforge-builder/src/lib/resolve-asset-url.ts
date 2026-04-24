const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Resolves an asset URL to an absolute URL for display in the builder.
 *
 * Handles three cases:
 * 1. Relative path ("/uploads/abc.png") → prepend API_URL
 * 2. Absolute with localhost → return as-is (builder runs on localhost)
 * 3. Already absolute with real host → return as-is
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return '';

  // Already absolute → use as-is (in builder, localhost URLs are reachable)
  if (url.startsWith('http')) return url;

  // Relative path → prepend API_URL
  return `${API_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
