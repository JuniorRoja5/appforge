/**
 * TECH_DEBT #90.B — barrido one-shot de blobs huérfanos en /uploads/.
 *
 * Standalone NestJS application via NestFactory.createApplicationContext.
 * Dry-run por defecto (lista huérfanos + MB liberables, NO borra). Pasar
 * --apply como argv para ejecutar storage.delete por cada huérfano.
 *
 * Ejecución (tras nest build):
 *   node dist/scripts/cleanup-orphan-blobs.js          # dry-run
 *   node dist/scripts/cleanup-orphan-blobs.js --apply  # borrado real
 *
 * Diseño:
 *   1. Construye Set<string> "en uso" desde dos fuentes:
 *      (a) Regex /\/uploads\/[a-zA-Z0-9._-]+/g sobre JSON stringificado de
 *          App.schema + App.appConfig — captura URLs en cualquier nivel
 *          del shape polimórfico (módulos, splash, onboarding, rich HTML
 *          de terms, etc.). Apps SIN filtro deletedAt → soft-deleted
 *          preservadas (voto (a) firmado, schema:111 muta el slug al
 *          soft-delete y no hay path de restore — preservar es la
 *          decisión segura).
 *      (b) Iteración explícita por columnas-URL medidas de tablas hijas
 *          (singles + plurales). Sin filtro deletedAt (las hijas de apps
 *          hard-deleted ya cascadearon, las de soft-deleted siguen vivas).
 *      AMBAS fuentes normalizadas a basename vía uploadUrlToKey ANTES
 *      del Set.add — el regex emite '/uploads/abc.jpg', el helper devuelve
 *      'abc.jpg'. Sin esta normalización, Set.has(entry.name) sería false
 *      para todas las del regex y se borrarían blobs vivos en --apply.
 *
 *   2. Lista archivos de /uploads/ (no recursivo — descarta builds/ y
 *      cualquier otra subdir antes del lookup). Por cada archivo cuyo
 *      basename NO esté en el Set "en uso", se marca como huérfano.
 *
 *   3. Dry-run: imprime lista + bytes liberables + comando spot-check
 *      para que el operador valide 2-3 huérfanos contra DB antes de
 *      --apply. --apply: storage.delete por cada uno con try/catch
 *      individual (best-effort, log de errores).
 *
 * Seguridad:
 *   - storage.delete pasa por LocalStorageProvider.resolve() endurecido
 *     (#90.0) — cualquier key con `../` o path absoluto se bloquea con
 *     throw, contenido al directorio uploads.
 *   - if (entry.isDirectory()) continue descarta builds/ antes de tocar
 *     el Set — los APK/AAB compilados son intocables.
 *   - app.close() en finally garantiza cierre de Prisma/Redis/BullMQ
 *     connections; sin esto el script colgaría tras completar.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { uploadUrlToKey } from '../lib/storage-key';

const logger = new Logger('OrphanBlobsScript');

interface Orphan {
  name: string;
  sizeBytes: number;
}

async function buildInUseSet(
  prisma: PrismaService,
): Promise<{ inUse: Set<string>; schemaCount: number; childCount: number; appsCount: number }> {
  const inUse = new Set<string>();
  let schemaCount = 0;
  let childCount = 0;

  // ─── Fuente (a): regex sobre schema + appConfig de TODAS las apps ───
  // Sin filtro deletedAt — incluye las soft-deleted (voto (a) preserva
  // sus blobs). Stringify del JSON entero y regex captura cualquier
  // /uploads/<algo> en cualquier nivel del shape polimórfico de schema.
  const apps = await prisma.app.findMany({
    select: { id: true, schema: true, appConfig: true },
  });

  for (const app of apps) {
    const combined = JSON.stringify({
      schema: app.schema,
      appConfig: app.appConfig,
    });
    const matches = combined.match(/\/uploads\/[a-zA-Z0-9._-]+/g) ?? [];
    for (const url of matches) {
      // CORRECCIÓN crítica: normalizar a basename vía uploadUrlToKey.
      // El regex emite '/uploads/abc.jpg' con prefijo; entry.name del
      // disco es 'abc.jpg'. Sin esta normalización el Set.has fallaría
      // para todas las del regex y se borrarían blobs vivos en --apply.
      const key = uploadUrlToKey(url);
      if (key) {
        inUse.add(key);
        schemaCount++;
      }
    }
  }

  // ─── Fuente (b): columnas-URL de tablas hijas (medidas en TECH_DEBT #90) ───
  // Singles. Sin filtro deletedAt — las hijas de apps hard-deleted ya
  // cascadearon (no existen); las de soft-deleted siguen vivas.
  const [
    appUsers,
    users,
    tenants,
    socialPosts,
    fanPosts,
    newsArticles,
    galleryItems,
    events,
    discountCoupons,
    menuCategories,
    menuItems,
    catalogCollections,
    pushNotifications,
  ] = await Promise.all([
    prisma.appUser.findMany({ select: { avatarUrl: true } }),
    prisma.user.findMany({ select: { avatarUrl: true } }),
    prisma.tenant.findMany({ select: { brandLogoUrl: true } }),
    prisma.socialPost.findMany({ select: { imageUrl: true } }),
    prisma.fanPost.findMany({ select: { imageUrl: true } }),
    prisma.newsArticle.findMany({ select: { imageUrl: true } }),
    prisma.galleryItem.findMany({ select: { imageUrl: true } }),
    prisma.event.findMany({ select: { imageUrl: true } }),
    prisma.discountCoupon.findMany({ select: { imageUrl: true } }),
    prisma.menuCategory.findMany({ select: { imageUrl: true } }),
    prisma.menuItem.findMany({ select: { imageUrl: true } }),
    prisma.catalogCollection.findMany({ select: { imageUrl: true } }),
    prisma.pushNotification.findMany({ select: { imageUrl: true } }),
  ]);

  // Helper genérico con acceso por NOMBRE de columna (no por posición).
  // Razón crítica: Object.values(row)[0] sería frágil — si en el futuro
  // un select añadiera `id: true` por debug, el orden de claves no está
  // garantizado por Prisma y [0] podría ser el id en lugar del url →
  // uploadUrlToKey(<uuid-id>) devuelve null → blob vivo se marca como
  // huérfano → se borra blob legítimo en --apply. Acceso por nombre
  // (row[col]) elimina ese modo de fallo: TS valida que 'avatarUrl'/
  // 'imageUrl'/'brandLogoUrl' existe en cada tipo de Prisma, y el value
  // viene del campo correcto independientemente del orden de claves.
  const addSingleColumn = <T extends object, K extends keyof T>(
    rows: T[],
    col: K,
  ): void => {
    for (const row of rows) {
      const key = uploadUrlToKey(row[col] as string | null);
      if (key) {
        inUse.add(key);
        childCount++;
      }
    }
  };

  addSingleColumn(appUsers, 'avatarUrl');
  addSingleColumn(users, 'avatarUrl');
  addSingleColumn(tenants, 'brandLogoUrl');
  addSingleColumn(socialPosts, 'imageUrl');
  addSingleColumn(fanPosts, 'imageUrl');
  addSingleColumn(newsArticles, 'imageUrl');
  addSingleColumn(galleryItems, 'imageUrl');
  addSingleColumn(events, 'imageUrl');
  addSingleColumn(discountCoupons, 'imageUrl');
  addSingleColumn(menuCategories, 'imageUrl');
  addSingleColumn(menuItems, 'imageUrl');
  addSingleColumn(catalogCollections, 'imageUrl');
  addSingleColumn(pushNotifications, 'imageUrl');

  // Plurales: ContactSubmission.fileUrls y CatalogProduct.imageUrls
  // (String[] en Postgres). Spread sobre cada array, uploadUrlToKey
  // por cada string.
  const [contactSubmissions, catalogProducts] = await Promise.all([
    prisma.contactSubmission.findMany({ select: { fileUrls: true } }),
    prisma.catalogProduct.findMany({ select: { imageUrls: true } }),
  ]);
  for (const row of contactSubmissions) {
    for (const url of row.fileUrls) {
      const key = uploadUrlToKey(url);
      if (key) {
        inUse.add(key);
        childCount++;
      }
    }
  }
  for (const row of catalogProducts) {
    for (const url of row.imageUrls) {
      const key = uploadUrlToKey(url);
      if (key) {
        inUse.add(key);
        childCount++;
      }
    }
  }

  return { inUse, schemaCount, childCount, appsCount: apps.length };
}

async function findOrphans(
  uploadsDir: string,
  inUseSet: Set<string>,
): Promise<{ orphans: Orphan[]; totalFiles: number; skippedDirs: number }> {
  const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
  const orphans: Orphan[] = [];
  let totalFiles = 0;
  let skippedDirs = 0;

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // builds/ (APK/AAB compilados) y cualquier otra subdir — intocables
      skippedDirs++;
      continue;
    }
    if (!entry.isFile()) continue;
    totalFiles++;

    if (inUseSet.has(entry.name)) continue;

    const stat = await fs.stat(path.join(uploadsDir, entry.name));
    orphans.push({ name: entry.name, sizeBytes: stat.size });
  }

  return { orphans, totalFiles, skippedDirs };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const storage = app.get(StorageService);
    const uploadsDir = path.join(process.cwd(), 'uploads');

    logger.log(apply ? '═══ [#90.B apply] ═══' : '═══ [#90.B dry-run] ═══');
    logger.log(`Directorio /uploads/: ${uploadsDir}`);

    // Validar que el directorio existe — si el script se ejecuta desde
    // un cwd equivocado, abortar limpio en vez de reportar "0 huérfanos"
    // silenciosamente (falso-OK peligroso).
    const dirExists = await fs
      .access(uploadsDir)
      .then(() => true)
      .catch(() => false);
    if (!dirExists) {
      logger.error(
        `Uploads directory no existe en ${uploadsDir}. ¿Corriendo desde el cwd correcto? ` +
          `Esperado: appforge-backend/ (con ./uploads/ dentro).`,
      );
      return;
    }

    const { inUse, schemaCount, childCount, appsCount } = await buildInUseSet(prisma);

    logger.log('');
    logger.log(`Conjunto "en uso" construido: ${inUse.size} keys únicos`);
    logger.log(
      `  · ${schemaCount} URLs extraídas de schema/appConfig (${appsCount} apps incluidas soft-deleted)`,
    );
    logger.log(`  · ${childCount} URLs de columnas-URL de tablas hijas`);

    const { orphans, totalFiles, skippedDirs } = await findOrphans(uploadsDir, inUse);
    const totalBytes = orphans.reduce((acc, o) => acc + o.sizeBytes, 0);

    logger.log('');
    logger.log(`${totalFiles} archivos en disco (excluyendo ${skippedDirs} subdir/s)`);
    logger.log(`${orphans.length} huérfanos detectados — ${formatBytes(totalBytes)} liberables`);
    logger.log('');

    if (orphans.length === 0) {
      logger.log('Nada que hacer — ningún huérfano en disco.');
      return;
    }

    logger.log('Lista de huérfanos:');
    for (const orphan of orphans) {
      logger.log(`  ${orphan.name}  ${formatBytes(orphan.sizeBytes)}`);
    }
    logger.log('');

    if (!apply) {
      logger.log('═══ Para ejecutar el borrado real: re-correr con --apply ═══');
      logger.log('');
      logger.log('ANTES de --apply (disciplina operacional):');
      logger.log('  1. Spot-check 2-3 huérfanos al azar contra DB:');
      logger.log(
        `     docker exec -i appforge-postgres psql -U appforge -d appforge_prod -t -A \\`,
      );
      logger.log(
        `       -c "SELECT COALESCE(\\"schema\\"::text,'') || COALESCE(\\"appConfig\\"::text,'') FROM \\"App\\";" \\`,
      );
      logger.log(`       | grep <uuid-huerfano>`);
      logger.log(`     (sin filtro deletedAt — incluye apps soft-deleted)`);
      logger.log(
        `     Si algún uuid aparece, el script lo clasificó mal → NO --apply, avisar.`,
      );
      logger.log('  2. Backup de /uploads/ (tar o cp -r) — destructivo e irreversible.');
      logger.log('  3. Con dry-run validado + backup hecho → ejecutar --apply.');
      return;
    }

    // ─── Rama --apply: borrado real ───
    logger.warn('Modo --apply: borrando huérfanos via storage.delete...');
    let deleted = 0;
    let errors = 0;
    let deletedBytes = 0;

    for (const orphan of orphans) {
      try {
        await storage.delete(orphan.name);
        deleted++;
        deletedBytes += orphan.sizeBytes;
        logger.log(`  ${orphan.name} ✓`);
      } catch (err) {
        errors++;
        logger.warn(
          `  ${orphan.name} FAILED: ${(err as Error).message}`,
        );
      }
    }

    logger.log('');
    logger.log(
      `Resultado: ${deleted} borrados, ${errors} errores, ${formatBytes(deletedBytes)} liberados`,
    );
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[OrphanBlobsScript] script falló:', err);
    process.exit(1);
  });
