import { getManifest } from './manifest';

/**
 * Resolves an asset URL (image, file) to an absolute URL reachable from the device.
 *
 * Handles three cases:
 * 1. Relative path ("/uploads/abc.png") → prepend apiUrl from manifest
 * 2. Absolute with localhost ("http://localhost:3000/uploads/abc.png") → extract path, prepend apiUrl
 * 3. Already absolute with real host → return as-is
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return '';

  const apiUrl = getManifest()?.apiUrl ?? '';

  // Already absolute with a real (non-localhost) host → use as-is
  if (url.startsWith('http') && !url.includes('localhost')) return url;

  // Absolute with localhost → extract the pathname and rebase
  if (url.startsWith('http')) {
    try {
      const pathname = new URL(url).pathname;
      return `${apiUrl}${pathname}`;
    } catch {
      return url;
    }
  }

  // Relative path → prepend apiUrl
  return `${apiUrl}${url.startsWith('/') ? url : `/${url}`}`;
}
