// ============================================================================
// AppForge SaaS — PM2 Ecosystem Config (Producción)
//
// Dos procesos separados:
// - appforge-api: NestJS HTTP server (puerto 3000)
// - appforge-worker: BullMQ worker (procesa builds)
//
// Uso:
//   pm2 start ecosystem.prod.config.js
//   pm2 logs appforge-api
//   pm2 logs appforge-worker
//   pm2 monit
// ============================================================================

module.exports = {
  apps: [
    // ======================================================================
    // Proceso 1: API HTTP Server
    // ======================================================================
    {
      name: 'appforge-api',
      script: 'dist/main.js',
      cwd: '/opt/appforge/appforge-backend',
      
      // Entorno
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        WORKER_MODE: 'separate', // No procesa builds aquí
      },
      
      // Variables de entorno desde archivo
      env_file: '/opt/appforge/appforge-backend/.env',

      // Reinicio automático
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',

      // Reintentos
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,

      // Logs
      output: '/var/log/appforge/api-out.log',
      error: '/var/log/appforge/api-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Ignore
      ignore_watch: [
        'node_modules',
        'dist',
        'tmp',
        '.git',
        'build',
      ],

      // Kill signal
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Health endpoint
      wait_ready: true,
      listen_timeout: 3000,
      kill_timeout: 5000,
    },

    // ======================================================================
    // Proceso 2: Worker BullMQ (Builds Android)
    // ======================================================================
    {
      name: 'appforge-worker',
      script: 'dist/worker.js',
      cwd: '/opt/appforge/appforge-backend',

      // Entorno
      env: {
        NODE_ENV: 'production',
        WORKER_MODE: 'separate', // Este sí procesa builds
      },

      // Variables de entorno desde archivo
      env_file: '/opt/appforge/appforge-backend/.env',

      // Configuración
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1024M', // Builds necesitan más memoria

      // Reintentos
      max_restarts: 5,
      min_uptime: '30s',
      autorestart: true,

      // Logs
      output: '/var/log/appforge/worker-out.log',
      error: '/var/log/appforge/worker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Ignore
      ignore_watch: [
        'node_modules',
        'dist',
        'tmp',
        '.git',
        'build',
      ],

      // El worker puede tardar en procesar builds
      kill_timeout: 300000, // 5 minutos para terminar builds gracefully
      listen_timeout: 30000,

      // No responde a health checks como API
      wait_ready: false,
    },
  ],

  // ========================================================================
  // Deploy (opcional, para automatizar deployments futuros)
  // ========================================================================
  deploy: {
    production: {
      user: 'root',
      host: 'TU_IP_SERVIDOR',
      key: '/root/.ssh/id_rsa',
      ref: 'origin/main',
      repo: 'https://github.com/JuniorRoja5/appforge.git',
      path: '/opt/appforge',
      'post-deploy':
        'cd appforge-backend && npm install && npm run build && npm run migrate && pm2 reload ecosystem.prod.config.js --update-env',
    },
  },
};
