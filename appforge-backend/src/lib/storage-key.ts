// Convierte una URL del modelo (avatarUrl, imageUrl, etc.) en la key
// relativa que se pasa a StorageService.delete(). La key NUNCA lleva el
// prefijo `/uploads/` — solo el segmento posterior (`abc.jpg` o
// `builds/x.apk`).
//
// La asimetría es CRÍTICA: si la key llevara el prefijo, path.resolve la
// trataría como absoluto override en LocalStorageProvider.resolve() (TECH_DEBT
// #90.0) y el check de contención la bloquearía con throw. El .catch del
// cleanup en el caller lo tragaría → los blobs quedarían huérfanos en
// silencio, justo el no-op silencioso que estamos arreglando.
//
// Acepta dos formas que conviven en BD:
//   - Path relativo: `/uploads/<key>` — la mayoría de campos persistidos.
//   - URL absoluta:  `https://<host>/uploads/<key>` — algunos clientes
//     guardan la URL completa; el `new URL(url).pathname` extrae el path.
//
// URLs externas (https://i.pravatar.cc/..., https://randomuser.me/...) NO
// son nuestros blobs y devuelven null — el cleanup las descarta.
// URL malformada (catch del new URL) → null. Best-effort.
export function uploadUrlToKey(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const pathname = url.startsWith('http') ? new URL(url).pathname : url;
    const match = pathname.match(/^\/uploads\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
