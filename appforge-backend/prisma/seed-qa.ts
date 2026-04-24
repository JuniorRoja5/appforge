/**
 * QA Seed Script — Genera datos de prueba para el checklist QA completo.
 *
 * Ejecutar:
 *   cd appforge-backend && npx ts-node prisma/seed-qa.ts
 *
 * Crea:
 *   - 1 SUPER_ADMIN (ya existe del seed principal)
 *   - 3 tenants CLIENT con distintos planes (Free, Starter, Pro)
 *   - 1 tenant CLIENT con suscripción expirada (para probar C1)
 *   - 1 tenant SUSPENDED (para probar suspensión)
 *   - Apps con módulos configurados para cada tenant
 *   - AppUsers de prueba para Bloque 5
 *   - AnalyticsEvents/Sessions para Bloque 6
 *   - Builds simulados (COMPLETED, FAILED) para historial
 */

import { PrismaClient, PlanType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import 'dotenv/config';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────

function uuid() { return crypto.randomUUID(); }

const SAMPLE_MODULES = [
  { moduleId: 'custom_page', config: { title: 'Inicio', content: '<h1>Bienvenido</h1><p>App de prueba QA</p>', backgroundColor: '#FFFFFF' }, tabLabel: 'Inicio', tabIcon: 'home' },
  { moduleId: 'news_feed', config: { title: 'Noticias', showImages: true, layout: 'card' }, tabLabel: 'Noticias', tabIcon: 'newspaper' },
  { moduleId: 'contact', config: { title: 'Contacto', email: 'qa@test.com', phone: '+34600000000', fields: ['name', 'email', 'message'] }, tabLabel: 'Contacto', tabIcon: 'mail' },
  { moduleId: 'photo_gallery', config: { title: 'Galería', columns: 2, showTitles: true }, tabLabel: 'Galería', tabIcon: 'image' },
  { moduleId: 'events', config: { title: 'Eventos', layout: 'list', showPastEvents: false }, tabLabel: 'Eventos', tabIcon: 'calendar' },
  { moduleId: 'loyalty_card', config: { title: 'Fidelidad', maxPoints: 10, reward: 'Café gratis', iconType: 'coffee' }, tabLabel: 'Fidelidad', tabIcon: 'star' },
  { moduleId: 'menu_restaurant', config: { title: 'Menú', currency: 'EUR', showAllergens: true }, tabLabel: 'Menú', tabIcon: 'utensils' },
  { moduleId: 'discount_coupon', config: { title: 'Cupones', showExpired: false }, tabLabel: 'Cupones', tabIcon: 'tag' },
  { moduleId: 'catalog', config: { title: 'Catálogo', currency: 'EUR', showPrices: true }, tabLabel: 'Catálogo', tabIcon: 'shopping-bag' },
  { moduleId: 'booking', config: { title: 'Reservas', slotDuration: 30, startHour: 9, endHour: 18 }, tabLabel: 'Reservas', tabIcon: 'clock' },
  { moduleId: 'social_wall', config: { title: 'Social Wall', allowImages: true }, tabLabel: 'Social', tabIcon: 'message-circle' },
  { moduleId: 'fan_wall', config: { title: 'Fan Wall', allowLikes: true }, tabLabel: 'Fans', tabIcon: 'heart' },
  { moduleId: 'links', config: { title: 'Enlaces', links: [{ label: 'Web', url: 'https://example.com', icon: 'globe' }] }, tabLabel: 'Links', tabIcon: 'link' },
  { moduleId: 'pdf_reader', config: { title: 'Documentos', pdfUrl: '' }, tabLabel: 'PDF', tabIcon: 'file-text' },
  { moduleId: 'push_notification', config: { title: 'Push' }, tabLabel: 'Push', tabIcon: 'bell' },
];

function buildSchema(moduleIds: string[]) {
  return moduleIds.map((modId, i) => {
    const mod = SAMPLE_MODULES.find((m) => m.moduleId === modId) ?? SAMPLE_MODULES[0];
    return { id: uuid(), moduleId: mod.moduleId, config: mod.config, tabIndex: i, tabLabel: mod.tabLabel, tabIcon: mod.tabIcon };
  });
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  const hash = await bcrypt.hash('test1234', 10);

  // Ensure plans exist (idempotent — depends on seed.ts having run first)
  const plans = await prisma.subscriptionPlan.findMany();
  if (plans.length === 0) {
    console.error('❌ No hay planes en la BD. Ejecuta primero: npx prisma db seed');
    process.exit(1);
  }
  const planMap = Object.fromEntries(plans.map((p) => [p.planType, p]));

  // ─── Tenant 1: Client FREE ────────────────────────────────────────
  const t1Id = 'qa-tenant-free';
  await prisma.tenant.upsert({
    where: { id: t1Id },
    update: {},
    create: { id: t1Id, name: 'QA Free Tenant' },
  });
  await prisma.user.upsert({
    where: { email: 'free@qa.test' },
    update: {},
    create: { email: 'free@qa.test', password: hash, role: 'CLIENT', tenantId: t1Id, firstName: 'QA', lastName: 'Free' },
  });
  await prisma.subscription.upsert({
    where: { tenantId: t1Id },
    update: {},
    create: { tenantId: t1Id, planId: planMap.FREE.id, expiresAt: new Date('2099-12-31') },
  });
  // App for Free tenant (1 app — at limit)
  const app1 = await prisma.app.upsert({
    where: { slug: 'qa-free-app' },
    update: {},
    create: {
      name: 'QA Free App',
      slug: 'qa-free-app',
      tenantId: t1Id,
      schema: buildSchema(['custom_page', 'contact', 'links']),
    },
  });
  console.log('✓ Tenant FREE: free@qa.test / test1234 — 1 app (at limit)');

  // ─── Tenant 2: Client STARTER ─────────────────────────────────────
  const t2Id = 'qa-tenant-starter';
  await prisma.tenant.upsert({
    where: { id: t2Id },
    update: {},
    create: { id: t2Id, name: 'QA Starter Tenant' },
  });
  await prisma.user.upsert({
    where: { email: 'starter@qa.test' },
    update: {},
    create: { email: 'starter@qa.test', password: hash, role: 'CLIENT', tenantId: t2Id, firstName: 'QA', lastName: 'Starter' },
  });
  await prisma.subscription.upsert({
    where: { tenantId: t2Id },
    update: {},
    create: { tenantId: t2Id, planId: planMap.STARTER.id, expiresAt: new Date('2099-12-31') },
  });
  const app2 = await prisma.app.upsert({
    where: { slug: 'qa-starter-app' },
    update: {},
    create: {
      name: 'QA Starter Full',
      slug: 'qa-starter-app',
      tenantId: t2Id,
      schema: buildSchema([
        'custom_page', 'news_feed', 'contact', 'photo_gallery', 'events',
        'loyalty_card', 'menu_restaurant', 'discount_coupon',
      ]),
    },
  });
  console.log('✓ Tenant STARTER: starter@qa.test / test1234 — 1 app (8 módulos)');

  // ─── Tenant 3: Client PRO (app con los 15 módulos) ────────────────
  const t3Id = 'qa-tenant-pro';
  await prisma.tenant.upsert({
    where: { id: t3Id },
    update: {},
    create: { id: t3Id, name: 'QA Pro Tenant' },
  });
  await prisma.user.upsert({
    where: { email: 'pro@qa.test' },
    update: {},
    create: { email: 'pro@qa.test', password: hash, role: 'CLIENT', tenantId: t3Id, firstName: 'QA', lastName: 'Pro' },
  });
  await prisma.subscription.upsert({
    where: { tenantId: t3Id },
    update: {},
    create: { tenantId: t3Id, planId: planMap.PRO.id, expiresAt: new Date('2099-12-31') },
  });
  // App with all 15 modules
  const app3 = await prisma.app.upsert({
    where: { slug: 'qa-pro-full' },
    update: {},
    create: {
      name: 'QA Pro Completa',
      slug: 'qa-pro-full',
      tenantId: t3Id,
      schema: buildSchema(SAMPLE_MODULES.map((m) => m.moduleId)),
    },
  });
  // Second app (for testing multiple apps)
  await prisma.app.upsert({
    where: { slug: 'qa-pro-second' },
    update: {},
    create: {
      name: 'QA Pro Segunda',
      slug: 'qa-pro-second',
      tenantId: t3Id,
      schema: buildSchema(['custom_page', 'news_feed', 'catalog']),
    },
  });
  console.log('✓ Tenant PRO: pro@qa.test / test1234 — 2 apps (15 + 3 módulos)');

  // ─── Tenant 4: EXPIRED subscription (para probar C1) ──────────────
  const t4Id = 'qa-tenant-expired';
  await prisma.tenant.upsert({
    where: { id: t4Id },
    update: {},
    create: { id: t4Id, name: 'QA Expired Tenant' },
  });
  await prisma.user.upsert({
    where: { email: 'expired@qa.test' },
    update: {},
    create: { email: 'expired@qa.test', password: hash, role: 'CLIENT', tenantId: t4Id, firstName: 'QA', lastName: 'Expired' },
  });
  await prisma.subscription.upsert({
    where: { tenantId: t4Id },
    update: {},
    create: {
      tenantId: t4Id,
      planId: planMap.STARTER.id,
      expiresAt: new Date('2024-01-01'), // Expired!
    },
  });
  console.log('✓ Tenant EXPIRED: expired@qa.test / test1234 — Sub Starter expirada');

  // ─── Tenant 5: SUSPENDED ──────────────────────────────────────────
  const t5Id = 'qa-tenant-suspended';
  await prisma.tenant.upsert({
    where: { id: t5Id },
    update: { status: 'SUSPENDED' },
    create: { id: t5Id, name: 'QA Suspended Tenant', status: 'SUSPENDED' },
  });
  await prisma.user.upsert({
    where: { email: 'suspended@qa.test' },
    update: { status: 'SUSPENDED' },
    create: { email: 'suspended@qa.test', password: hash, role: 'CLIENT', tenantId: t5Id, firstName: 'QA', lastName: 'Suspended', status: 'SUSPENDED' },
  });
  await prisma.subscription.upsert({
    where: { tenantId: t5Id },
    update: {},
    create: { tenantId: t5Id, planId: planMap.FREE.id, expiresAt: new Date('2099-12-31') },
  });
  console.log('✓ Tenant SUSPENDED: suspended@qa.test / test1234');

  // ─── AppUsers for Bloque 5 (on pro app) ───────────────────────────
  const appUserHash = await bcrypt.hash('appuser123', 10);
  for (let i = 1; i <= 10; i++) {
    await prisma.appUser.upsert({
      where: { appId_email: { appId: app3.id, email: `user${i}@testapp.com` } },
      update: {},
      create: {
        appId: app3.id,
        email: `user${i}@testapp.com`,
        passwordHash: appUserHash,
        firstName: `TestUser`,
        lastName: `${i}`,
        status: i === 10 ? 'BANNED' : 'ACTIVE',
        lastLoginAt: new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000),
      },
    });
  }
  console.log('✓ 10 AppUsers creados en QA Pro app (user1-10@testapp.com / appuser123)');

  // ─── Analytics for Bloque 6 ───────────────────────────────────────
  const now = Date.now();
  const platforms = ['android', 'ios', 'web'];
  const eventTypes = ['screen_view', 'session_start', 'session_end', 'module_view'];
  const moduleIds = ['custom_page', 'news_feed', 'contact', 'photo_gallery', 'events'];

  // Create 50 sessions spread over last 30 days
  for (let i = 0; i < 50; i++) {
    const sessionStart = new Date(now - Math.random() * 30 * 24 * 3600 * 1000);
    const duration = Math.floor(Math.random() * 600) + 30; // 30s–630s
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const sessionId = uuid();

    await prisma.analyticsSession.create({
      data: {
        appId: app3.id,
        appUserId: null,
        platform,
        deviceModel: platform === 'android' ? 'Pixel 7' : platform === 'ios' ? 'iPhone 15' : 'Chrome',
        osVersion: platform === 'android' ? '14' : platform === 'ios' ? '17.2' : 'Web',
        startedAt: sessionStart,
        endedAt: new Date(sessionStart.getTime() + duration * 1000),
        duration,
      },
    });

    // 3-8 events per session
    const eventCount = Math.floor(Math.random() * 6) + 3;
    for (let j = 0; j < eventCount; j++) {
      await prisma.analyticsEvent.create({
        data: {
          appId: app3.id,
          sessionId,
          eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          moduleId: Math.random() > 0.3 ? moduleIds[Math.floor(Math.random() * moduleIds.length)] : null,
          platform,
          deviceModel: platform === 'android' ? 'Pixel 7' : 'iPhone 15',
          osVersion: '14',
          timestamp: new Date(sessionStart.getTime() + Math.random() * duration * 1000),
        },
      });
    }
  }
  console.log('✓ 50 sesiones + ~250 analytics events generados (últimos 30 días)');

  // ─── Simulated builds for history ─────────────────────────────────
  const buildTypes = ['debug', 'release', 'aab'];
  const schemaHash = crypto.createHash('sha256').update(JSON.stringify([])).digest('hex').slice(0, 16);

  // 2 completed + 1 failed for starter app
  await prisma.appBuild.create({
    data: {
      appId: app2.id, status: 'COMPLETED', buildType: 'DEBUG', schemaHash,
      startedAt: new Date(now - 7 * 24 * 3600 * 1000),
      completedAt: new Date(now - 7 * 24 * 3600 * 1000 + 120_000),
      artifactUrl: '/builds/fake-debug.apk', artifactSize: 15_000_000,
      logOutput: 'BUILD SUCCESSFUL in 2m 0s\n18 actionable tasks: 18 executed',
    },
  });
  await prisma.appBuild.create({
    data: {
      appId: app2.id, status: 'FAILED', buildType: 'RELEASE', schemaHash,
      startedAt: new Date(now - 3 * 24 * 3600 * 1000),
      completedAt: new Date(now - 3 * 24 * 3600 * 1000 + 90_000),
      errorMessage: 'Execution failed for task :app:mergeReleaseResources — duplicate resources',
      logOutput: 'FAILURE: Build failed with an exception.\n> Execution failed for task :app:mergeReleaseResources\n> A failure occurred while executing com.android.build.gradle...',
    },
  });
  await prisma.appBuild.create({
    data: {
      appId: app2.id, status: 'COMPLETED', buildType: 'RELEASE', schemaHash,
      startedAt: new Date(now - 1 * 24 * 3600 * 1000),
      completedAt: new Date(now - 1 * 24 * 3600 * 1000 + 180_000),
      artifactUrl: '/builds/fake-release.apk', artifactSize: 12_000_000,
      logOutput: 'BUILD SUCCESSFUL in 3m 0s\n22 actionable tasks: 22 executed',
    },
  });
  console.log('✓ 3 builds simulados (2 COMPLETED + 1 FAILED) en starter app');

  // ─── News articles for news_feed module ───────────────────────────
  for (let i = 1; i <= 5; i++) {
    await prisma.newsArticle.upsert({
      where: { id: `qa-news-${i}` },
      update: {},
      create: {
        id: `qa-news-${i}`,
        appId: app3.id,
        title: `Noticia de prueba #${i}`,
        content: `<p>Contenido de la noticia número ${i} para pruebas QA.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`,
        publishedAt: new Date(now - i * 24 * 3600 * 1000),
      },
    });
  }
  console.log('✓ 5 artículos de noticias en QA Pro app');

  // ─── Events ───────────────────────────────────────────────────────
  await prisma.event.upsert({
    where: { id: 'qa-event-1' },
    update: {},
    create: {
      id: 'qa-event-1', appId: app3.id, title: 'Evento de prueba QA',
      description: 'Evento para verificar el módulo de eventos',
      location: 'Madrid, España', eventDate: new Date(now + 7 * 24 * 3600 * 1000),
      category: 'Tech', organizer: 'QA Team',
    },
  });
  await prisma.event.upsert({
    where: { id: 'qa-event-2' },
    update: {},
    create: {
      id: 'qa-event-2', appId: app3.id, title: 'Evento pasado',
      description: 'Evento ya ocurrido',
      location: 'Barcelona', eventDate: new Date(now - 14 * 24 * 3600 * 1000),
    },
  });
  console.log('✓ 2 eventos (1 futuro + 1 pasado)');

  // ─── Menu restaurant ─────────────────────────────────────────────
  const catId = 'qa-menu-cat-1';
  await prisma.menuCategory.upsert({
    where: { id: catId },
    update: {},
    create: { id: catId, appId: app3.id, name: 'Entrantes', order: 0 },
  });
  await prisma.menuItem.upsert({
    where: { id: 'qa-menu-item-1' },
    update: {},
    create: { id: 'qa-menu-item-1', categoryId: catId, name: 'Patatas bravas', price: 6.50, description: 'Con salsa brava casera', allergens: ['gluten'], order: 0 },
  });
  await prisma.menuItem.upsert({
    where: { id: 'qa-menu-item-2' },
    update: {},
    create: { id: 'qa-menu-item-2', categoryId: catId, name: 'Croquetas de jamón', price: 8.00, description: '6 unidades', allergens: ['gluten', 'lactosa'], order: 1 },
  });
  console.log('✓ Menú restaurante (1 categoría + 2 items)');

  // ─── Discount coupons ─────────────────────────────────────────────
  await prisma.discountCoupon.upsert({
    where: { appId_code: { appId: app3.id, code: 'QA10' } },
    update: {},
    create: {
      appId: app3.id, title: '10% descuento QA', code: 'QA10',
      discountType: 'PERCENTAGE', discountValue: 10, maxUses: 100,
      validUntil: new Date(now + 30 * 24 * 3600 * 1000), isActive: true,
    },
  });
  console.log('✓ 1 cupón de descuento (QA10 — 10%)');

  // ─── Catalog ──────────────────────────────────────────────────────
  const colId = 'qa-catalog-col-1';
  await prisma.catalogCollection.upsert({
    where: { id: colId },
    update: {},
    create: { id: colId, appId: app3.id, name: 'Colección QA', order: 0 },
  });
  await prisma.catalogProduct.upsert({
    where: { id: 'qa-product-1' },
    update: {},
    create: { id: 'qa-product-1', collectionId: colId, name: 'Producto Test', price: 19.99, description: 'Producto de prueba', inStock: true, order: 0 },
  });
  console.log('✓ Catálogo (1 colección + 1 producto)');

  // ─── Summary ──────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('  QA SEED COMPLETO — Cuentas de prueba:');
  console.log('══════════════════════════════════════════════════');
  console.log('  SUPER ADMIN:  admin@appforge.com / admin123');
  console.log('  CLIENT FREE:  free@qa.test / test1234        (1/1 apps)');
  console.log('  CLIENT START: starter@qa.test / test1234     (1/1 apps, builds)');
  console.log('  CLIENT PRO:   pro@qa.test / test1234         (2/5 apps, 15 módulos)');
  console.log('  EXPIRED:      expired@qa.test / test1234     (sub expirada)');
  console.log('  SUSPENDED:    suspended@qa.test / test1234   (tenant suspendido)');
  console.log('  APP USERS:    user1-10@testapp.com / appuser123');
  console.log('══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
