import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { Client as MinioClient } from 'minio';
import type { StorageProvider } from './storage.interface.js';

export class MinioStorageProvider implements StorageProvider {
  private client: MinioClient;
  private bucket: string;

  constructor() {
    this.client = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || '',
    });
    this.bucket = process.env.MINIO_BUCKET || 'appforge-builds';
  }

  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async upload(key: string, filePath: string, contentType?: string): Promise<string> {
    await this.ensureBucket();
    const headers = contentType ? { 'Content-Type': contentType } : undefined;
    await this.client.fPutObject(this.bucket, key, filePath, headers as any);
    return key;
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    return this.client.getObject(this.bucket, key);
  }

  async download(key: string, destPath: string): Promise<void> {
    await fsp.mkdir(path.dirname(destPath), { recursive: true });
    await this.client.fGetObject(this.bucket, key, destPath);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key).catch(() => {});
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  async getSize(key: string): Promise<number> {
    const stat = await this.client.statObject(this.bucket, key);
    return stat.size;
  }
}
