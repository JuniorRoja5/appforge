import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import type { StorageProvider } from './storage.interface.js';

export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  constructor() {
    this.basePath = path.join(process.cwd(), 'uploads');
  }

  private resolve(key: string): string {
    return path.join(this.basePath, key);
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
