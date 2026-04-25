import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// ============================================================================
// AppForge SaaS — Seed Script (Producción)
//
// Crea datos iniciales:
// - 5 SubscriptionPlans (FREE, STARTER, PRO, RESELLER_STARTER, RESELLER_PRO)
// - 1 Tenant "AppForge Admin"
// - 1 Usuario SUPER_ADMIN (admin@appforge.com / admin123)
// - 1 Subscription (FREE) asignada al tenant admin
//
// Uso:
//   npm run seed
// ============================================================================

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos...\n');

  // ========================================================================
  // 1. Crear o actualizar planes de suscripción
  // ========================================================================
  console.log('📋 Creando planes de suscripción...');

  const plans = [
    {
      name: 'FREE',
      displayName: 'Gratis',
      monthlyPrice: 0,
      yearlyPrice: 0,
      appLimit: 1,
      moduleLimit: 5,
      monthlyBuildsLimit: 10,
      storageGbLimit: 1,
      customDomain: false,
      whiteLabel: false,
      apiAccess: false,
      priority: false,
      description: 'Plan gratuito para comenzar',
      features: [
        'Crear hasta 1 aplicación',
        'Acceso a 5 módulos',
        'Hasta 10 builds por mes',
        '1 GB de almacenamiento',
        'Soporte por email',
      ],
    },
    {
      name: 'STARTER',
      displayName: 'Iniciador',
      monthlyPrice: 2999, // $29.99 en centavos
      yearlyPrice: 29990,
      appLimit: 3,
      moduleLimit: 15,
      monthlyBuildsLimit: 50,
      storageGbLimit: 10,
      customDomain: false,
      whiteLabel: false,
      apiAccess: false,
      priority: false,
      description: 'Para emprendedores y pequeños negocios',
      features: [
        'Crear hasta 3 aplicaciones',
        'Acceso a 15 módulos',
        'Hasta 50 builds por mes',
        '10 GB de almacenamiento',
        'Analytics básico',
        'Soporte prioritario',
      ],
    },
    {
      name: 'PRO',
      displayName: 'Profesional',
      monthlyPrice: 9999, // $99.99
      yearlyPrice: 99990,
      appLimit: 10,
      moduleLimit: null, // Todos
      monthlyBuildsLimit: 500,
      storageGbLimit: 100,
      customDomain: true,
      whiteLabel: false,
      apiAccess: true,
      priority: true,
      description: 'Para agencias y negocios en crecimiento',
      features: [
        'Crear hasta 10 aplicaciones',
        'Acceso a todos los módulos',
        'Hasta 500 builds por mes',
        '100 GB de almacenamiento',
        'Dominio personalizado',
        'API de acceso programático',
        'Analytics avanzado',
        'Soporte 24/7 prioritario',
      ],
    },
    {
      name: 'RESELLER_STARTER',
      displayName: 'Reseller Básico',
      monthlyPrice: 19999, // $199.99
      yearlyPrice: 199990,
      appLimit: 50,
      moduleLimit: null,
      monthlyBuildsLimit: 2000,
      storageGbLimit: 500,
      customDomain: true,
      whiteLabel: true, // ← Diferencia clave
      apiAccess: true,
      priority: true,
      description: 'Para resellers y agencias con white-label',
      features: [
        'Crear hasta 50 aplicaciones para tus clientes',
        'Acceso a todos los módulos',
        'Hasta 2000 builds por mes',
        '500 GB de almacenamiento',
        'Dominio personalizado',
        'White-label: personaliza marca y colores',
        'API de acceso programático',
        'Soporte 24/7 dedicado',
      ],
    },
    {
      name: 'RESELLER_PRO',
      displayName: 'Reseller Premium',
      monthlyPrice: 49999, // $499.99
      yearlyPrice: 499990,
      appLimit: null, // Ilimitado
      moduleLimit: null,
      monthlyBuildsLimit: null,
      storageGbLimit: null,
      customDomain: true,
      whiteLabel: true,
      apiAccess: true,
      priority: true,
      description: 'Para resellers enterprise sin límites',
      features: [
        'Aplicaciones ilimitadas',
        'Acceso a todos los módulos',
        'Builds ilimitados',
        'Almacenamiento ilimitado',
        'Dominio personalizado',
        'White-label completo',
        'API de acceso programático',
        'Webhooks personalizados',
        'Soporte 24/7 dedicado',
        'Asesoramiento de arquitectura',
      ],
    },
  ];

  const createdPlans = [];
  for (const plan of plans) {
    const created = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name as any },
      update: {
        displayName: plan.displayName,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        appLimit: plan.appLimit,
        moduleLimit: plan.moduleLimit,
        monthlyBuildsLimit: plan.monthlyBuildsLimit,
        storageGbLimit: plan.storageGbLimit,
        customDomain: plan.customDomain,
        whiteLabel: plan.whiteLabel,
        apiAccess: plan.apiAccess,
        priority: plan.priority,
        description: plan.description,
        features: plan.features,
      },
      create: {
        name: plan.name as any,
        displayName: plan.displayName,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        appLimit: plan.appLimit,
        moduleLimit: plan.moduleLimit,
        monthlyBuildsLimit: plan.monthlyBuildsLimit,
        storageGbLimit: plan.storageGbLimit,
        customDomain: plan.customDomain,
        whiteLabel: plan.whiteLabel,
        apiAccess: plan.apiAccess,
        priority: plan.priority,
        description: plan.description,
        features: plan.features,
      },
    });
    createdPlans.push(created);
    console.log(`  ✓ Plan ${created.displayName}`);
  }

  // ========================================================================
  // 2. Crear Tenant Admin
  // ========================================================================
  console.log('\n👤 Creando tenant administrador...');

  const adminTenant = await prisma.tenant.upsert({
    where: { id: 'appforge-admin' },
    update: {
      name: 'AppForge Admin',
      status: 'ACTIVE',
    },
    create: {
      id: 'appforge-admin',
      name: 'AppForge Admin',
      status: 'ACTIVE',
    },
  });

  console.log(`  ✓ Tenant: ${adminTenant.name}`);

  // ========================================================================
  // 3. Crear Usuario SUPER_ADMIN
  // ========================================================================
  console.log('\n🔑 Creando usuario SUPER_ADMIN...');

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    console.error('\n❌ ERROR: SEED_ADMIN_PASSWORD environment variable required (min 12 chars).');
    console.error('   Run: SEED_ADMIN_PASSWORD="$(openssl rand -base64 24)" npx prisma db seed');
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@appforge.com' },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      tenantId: adminTenant.id,
      firstName: 'AppForge',
      lastName: 'Administrator',
      company: 'AppForge SaaS',
    },
    create: {
      email: 'admin@appforge.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      tenantId: adminTenant.id,
      firstName: 'AppForge',
      lastName: 'Administrator',
      company: 'AppForge SaaS',
    },
  });

  console.log(`  ✓ Usuario: ${adminUser.email}`);
  console.log(`  ✓ Contraseña: admin123 (CAMBIAR EN PRODUCCIÓN)`);

  // ========================================================================
  // 4. Crear Suscripción FREE para el tenant admin
  // ========================================================================
  console.log('\n💳 Asignando suscripción...');

  const freePlan = createdPlans.find((p) => p.name === 'FREE');

  const subscription = await prisma.subscription.upsert({
    where: { tenantId: adminTenant.id },
    update: {
      planId: freePlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      tenantId: adminTenant.id,
      planId: freePlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`  ✓ Plan asignado: ${freePlan.displayName}`);
  console.log(`  ✓ Estado: ${subscription.status}`);

  // ========================================================================
  // Resumen
  // ========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ Seed completado exitosamente');
  console.log('='.repeat(60));
  console.log('\n📊 Resumen:');
  console.log(`  • ${createdPlans.length} planes de suscripción creados`);
  console.log(`  • 1 tenant administrador creado`);
  console.log(`  • 1 usuario SUPER_ADMIN creado`);
  console.log(`  • 1 suscripción FREE asignada`);
  console.log('\n🔐 Credenciales iniciales (CAMBIAR EN PRODUCCIÓN):');
  console.log(`  Email: admin@appforge.com`);
  console.log(`  Contraseña: admin123`);
  console.log(`  Rol: SUPER_ADMIN`);
  console.log('\n⚠️  IMPORTANTE:');
  console.log('  1. Accede a admin.creatu.app');
  console.log('  2. Cambia la contraseña del admin');
  console.log('  3. Configura tus datos de Stripe');
  console.log('  4. Invite a tus primeros clientes');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
