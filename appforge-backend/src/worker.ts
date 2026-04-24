import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

/**
 * Standalone BullMQ worker process.
 *
 * Runs independently from the HTTP server. If this process crashes (OOM,
 * unhandled exception in a build), the API server keeps running and can
 * report the failure to the frontend.
 *
 * Usage:
 *   Development:  npx ts-node -r tsconfig-paths/register src/worker.ts
 *   Production:   node dist/worker.js
 *   PM2:          pm2 start ecosystem.config.js
 */
async function bootstrap() {
  // Fail-fast on missing secrets (same check as main.ts)
  const requiredEnvVars = ['JWT_SECRET', 'APP_USER_JWT_SECRET', 'SMTP_ENCRYPTION_KEY', 'KEYSTORE_ENCRYPTION_KEY'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`[FATAL] Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Create a NestJS app without HTTP listeners — only the BullMQ worker
  const app = await NestFactory.createApplicationContext(WorkerModule);

  console.log('[Worker] BullMQ build worker started. Waiting for jobs...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Worker] SIGTERM received, shutting down...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[Worker] SIGINT received, shutting down...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
