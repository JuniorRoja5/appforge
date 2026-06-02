import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

  // SECURITY: validate request bodies against DTOs.
  // - whitelist: strip props not declared on the DTO (silent — does not reject).
  // - forbidNonWhitelisted: false until every controller in the backend has been
  //   audited and migrated to a real DTO (today some still use Record<string, unknown>
  //   or inline interface types). Tracked in TECH_DEBT.
  // - transform: cast primitives ("8080" → 8080) and instantiate DTO classes so
  //   class-validator decorators run.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

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

  // PWA serving migrated to apps.creatu.app (nginx static, /var/www/apps).
  // El middleware /pwa anterior + mkdir de public/pwa retirados — la API ya
  // no participa del servido de PWAs.

  // Raw body for Stripe webhook signature verification (MUST be before json middleware)
  app.use('/stripe/webhook', raw({ type: 'application/json' }));
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
