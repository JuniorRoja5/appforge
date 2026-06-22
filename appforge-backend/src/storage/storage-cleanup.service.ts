import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from './storage.service';
import { uploadUrlToKey } from '../lib/storage-key';

// Helper compartido para limpieza de blobs en /uploads/ tras un delete-row
// (TECH_DEBT #90.A). Extraído del cleanupBlobs privado original de
// AppUsersService — el patrón se repetiría literal en 9+ services UGC con
// delete (gallery, news, events, contact, coupons, menu×2, catalog×2, +
// social-wall y fan-wall en A.3 dentro de tx). Centralizar evita la
// duplicación y los cambios futuros (métricas, prefix de log, reintentos)
// tocan un solo sitio.
//
// Contrato: deleteBlobs(urls) acepta cualquier array de strings — URLs de
// blob persistidas en BD (avatarUrl, imageUrl single, o spread de plurales
// como imageUrls/fileUrls). Internamente:
//   1. Convierte cada URL → key relativa vía uploadUrlToKey (descarta
//      externas y malformadas → null).
//   2. Promise.all por blob individual con .catch dedicado — un fallo no
//      aborta los demás (a diferencia de un .catch envolvente del Promise.all
//      entero, que cortaría al primer reject).
//   3. Log warn con prefix [StorageCleanupService] al fallar — el problema
//      vive aquí ahora, no en el caller.
//
// Defensa en capas: la seguridad traversal vive en LocalStorageProvider
// .resolve() endurecido (#90.0); este servicio confía en esa contención.
// Si llega una key con `../` o path absoluto, resolve() throw → el catch
// de aquí logea warn → la fila no se tumba, blob malicioso no se borra.
@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);

  constructor(private storage: StorageService) {}

  async deleteBlobs(urls: string[]): Promise<void> {
    const keys = urls
      .map(uploadUrlToKey)
      .filter((k): k is string => k !== null);

    await Promise.all(
      keys.map((key) =>
        this.storage.delete(key).catch((err: Error) => {
          this.logger.warn(
            `[StorageCleanupService] cleanup blob failed key=${key}: ${err.message}`,
          );
        }),
      ),
    );
  }
}
