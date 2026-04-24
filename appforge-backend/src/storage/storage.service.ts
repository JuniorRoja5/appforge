import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { StorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { MinioStorageProvider } from './minio-storage.provider.js';

@Injectable()
export class StorageService implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private provider: StorageProvider;

  constructor() {
    const providerType = process.env.STORAGE_PROVIDER || 'local';

    if (providerType === 'minio') {
      this.provider = new MinioStorageProvider();
      this.logger.log('Using MinIO storage provider');
    } else {
      this.provider = new LocalStorageProvider();
      this.logger.log('Using local storage provider');
    }
  }

  async onModuleInit() {
    if (this.provider instanceof MinioStorageProvider) {
      try {
        await this.provider.ensureBucket();
        this.logger.log('MinIO bucket ready');
      } catch (err) {
        this.logger.warn(`MinIO bucket init failed: ${err}. Falling back to local storage.`);
        this.provider = new LocalStorageProvider();
      }
    }
  }

  upload(key: string, filePath: string, contentType?: string): Promise<string> {
    return this.provider.upload(key, filePath, contentType);
  }

  getStream(key: string): Promise<NodeJS.ReadableStream> {
    return this.provider.getStream(key);
  }

  download(key: string, destPath: string): Promise<void> {
    return this.provider.download(key, destPath);
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  getSize(key: string): Promise<number> {
    return this.provider.getSize(key);
  }
}
