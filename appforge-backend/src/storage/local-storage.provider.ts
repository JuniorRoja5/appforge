import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import type { StorageProvider } from './storage.interface.js';

export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  constructor() {
    this.basePath = path.join(process.cwd(), 'uploads');
  }

  // TECH_DEBT #90.0 — endurecimiento contra path traversal. El método
  // resolve() es el único punto por el que pasan TODOS los call-sites del
  // provider (delete, getStream, download, exists, getSize, upload), así
  // que centralizar aquí la validación cubre las 6 superficies a la vez.
  //
  // path.join() crudo es vulnerable: join('/uploads', '../etc/passwd')
  // resuelve a '/etc/passwd'. Hoy todos los keys que llegan vienen del
  // servidor (artifactUrl, keystorePath generados por build.processor /
  // keystore.service), así que el agujero es teórico — pero #90.A va a
  // introducir el primer call-site con valor controlado por cliente
  // (avatarUrl de AppUser al borrar cuenta, imágenes UGC al borrar
  // posts). En el momento que enganchemos esos hooks, el traversal se
  // vuelve explotable. Endurecer aquí PRIMERO es prerequisito de #90.A.
  //
  // Estrategia:
  //   1. path.resolve(basePath, key) canonicaliza a absoluto (colapsa ../,
  //      resuelve segmentos relativos, normaliza separadores).
  //   2. Verificar contención: el absoluto debe ser exactamente basePath
  //      o empezar por basePath + path.sep. El sufijo +sep evita que
  //      `/uploads-evil/x` pase como si estuviera bajo `/uploads`.
  //   3. Si no está contenido → throw ruidoso (no no-op silencioso).
  //      Los call-sites legítimos del servidor nunca disparan el throw;
  //      los hooks de #90.A van envueltos en try/catch best-effort, así
  //      que un throw aquí se traga sin tumbar el borrado de la fila —
  //      exactamente el comportamiento que queremos: el blob malicioso
  //      no se borra, la cuenta sí.
  //
  // Sub-bug que también arregla: hoy si key fuera un path absoluto
  // (ej. '/etc/passwd' del cliente), path.join lo trataría como segmento
  // relativo, pero path.resolve lo trata como override → mismo resultado
  // que el traversal: bloqueado por el check de contención.
  private resolve(key: string): string {
    const full = path.resolve(this.basePath, key);
    if (full !== this.basePath && !full.startsWith(this.basePath + path.sep)) {
      throw new Error(`Path traversal blocked for key: ${key}`);
    }
    return full;
  }

  async upload(key: string, filePath: string): Promise<string> {
    const dest = this.resolve(key);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(filePath, dest);
    return key;
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    const fullPath = this.resolve(key);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${key}`);
    }
    return fs.createReadStream(fullPath);
  }

  async download(key: string, destPath: string): Promise<void> {
    const fullPath = this.resolve(key);
    await fsp.mkdir(path.dirname(destPath), { recursive: true });
    await fsp.copyFile(fullPath, destPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.resolve(key);
    await fsp.unlink(fullPath).catch(() => {});
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fsp.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async getSize(key: string): Promise<number> {
    const stat = await fsp.stat(this.resolve(key));
    return stat.size;
  }
}
