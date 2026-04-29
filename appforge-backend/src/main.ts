import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded, raw } from 'express';

async function bootstrap() {
  // SECURITY: Fail-fast if critical environment variables are missing.
  // Prevents running with insecure fallback secrets.
  const requiredEnvVars = ['JWT_SECRET', 'APP_USER_JWT_SECRET', 'SMTP_ENCRYPTION_KEY', 'KEYSTORE_ENCRYPTION_KEY'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`[FATAL] Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  const allowedOrigins = [
    process.env.PUBLIC_BUILDER_URL,
    process.env.PUBLIC_ADMIN_URL,
  ].filter(Boolean) as string[];

  // SECURITY NOTE (C4): CORS allows !origin (null Origin) intentionally.
  // Capacitor WebViews do not send an Origin header, so blocking null origins
  // would break all generated mobile apps. CSRF is not a concern because:
  // 1. All sensitive endpoints require a Bearer token (not cookies).
  // 2. Without cookie-based auth, classic CSRF attacks don't apply.
  // 3. Null origin also allows curl/Postman, but those still need a valid token.
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      // Allow Capacitor WebView origin (uses https://localhost with androidScheme: 'https')
      if (origin === 'https://localhost' || origin === 'capacitor://localhost') {
        return callback(null, true);
      }

      // In development, allow any localhost or local network origin (Vite may pick different ports)
      if (!isProduction && /^https?:\/\/(localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // In production, only allow explicitly configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(null, false);
    },
    credentials: true,
  });
  // Security headers for uploaded files (public by design but prevent sniffing/indexing)
  app.use('/uploads', (req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    next();
  });

  // PWA static files — cache strategy per file type (Agente 5: Security)
  app.use('/pwa', (req: any, res: any, next: any) => {
    const swMatch = req.path.match(/^\/([^/]+)\/sw\.js$/);
    if (swMatch) {
      // Service workers MUST not be cached
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Service-Worker-Allowed', `/pwa/${swMatch[1]}/`);
    } else if (req.path.endsWith('.webmanifest')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      // Static assets: aggressive caching (hashed filenames)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // PWA SPA fallback — serve index.html for non-file routes (Agente 6: Serving)
  // Mounted on /pwa, extracts slug manually to avoid path-to-regexp wildcard issues
  const fsNode = await import('fs');
  const pathNode = await import('path');
  app.use('/pwa', (req: any, res: any, next: any) => {
    if (req.path.includes('.')) return next();
    const parts = req.path.split('/').filter(Boolean);
    if (parts.length === 0) return next();
    const slug = parts[0];
    const indexPath = pathNode.join(process.cwd(), 'public', 'pwa', slug, 'index.html');
    if (fsNode.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });

  // Raw body for Stripe webhook signature verification (MUST be before json middleware)
  app.use('/stripe/webhook', raw({ type: 'application/json' }));
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Ensure PWA directory exists
  const pwaDirPath = pathNode.join(process.cwd(), 'public', 'pwa');
  if (!fsNode.existsSync(pwaDirPath)) {
    fsNode.mkdirSync(pwaDirPath, { recursive: true });
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
