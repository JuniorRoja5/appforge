/**
 * PM2 ecosystem config for production deployment.
 *
 * Runs two separate processes:
 *   - appforge-api:    HTTP server (NestJS) — handles all API requests
 *   - appforge-worker: BullMQ worker — processes build jobs in isolation
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 logs
 *   pm2 restart all
 *
 * If the worker crashes (OOM during Gradle build, etc.), the API stays up
 * and can report the failure to the frontend. PM2 auto-restarts the worker.
 */
module.exports = {
  apps: [
    {
      name: 'appforge-api',
      script: 'dist/main.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        WORKER_MODE: 'separate',
      },
      max_memory_restart: '512M',
    },
    {
      name: 'appforge-worker',
      script: 'dist/worker.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
      // Workers can use more memory during Gradle builds
      max_memory_restart: '1G',
      // Auto-restart if worker crashes
      autorestart: true,
      // Wait 5s before restart (let child processes clean up)
      restart_delay: 5000,
    },
  ],
};
