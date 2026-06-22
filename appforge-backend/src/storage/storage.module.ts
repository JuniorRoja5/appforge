import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { StorageCleanupService } from './storage-cleanup.service.js';

@Global()
@Module({
  providers: [StorageService, StorageCleanupService],
  exports: [StorageService, StorageCleanupService],
})
export class StorageModule {}
