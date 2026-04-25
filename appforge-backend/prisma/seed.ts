import { PrismaClient, PlanType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

const PLANS = [
  { name: 'Free',             planType: PlanType.FREE,             maxApps: 1,  maxBuildsPerMonth: 0,   storageGb: 0.2,  canBuild: false, isWhiteLabel: false, priceMonthly: 0  },
  { name: 'Starter',          planType: PlanType.STARTER,          maxApps: 1,  maxBuildsPerMonth: 5,   storageGb: 0.6,  canBuild: true,  isWhiteLabel: false, priceMonthly: 9  },
  { name: 'Pro',              planType: PlanType.PRO,              maxApps: 5,  maxBuildsPerMonth: 20,  storageGb: 2.0,  canBuild: true,  isWhiteLabel: false, priceMonthly: 29 },
  { name: 'Reseller Starter', planType: PlanType.RESELLER_STARTER, maxApps: 20, maxBuildsPerMonth: 60,  storageGb: 10.0, canBuild: true,  isWhiteLabel: true,  priceMonthly: 39 },
  { name: 'Reseller Pro',     planType: PlanType.RESELLER_PRO,     maxApps: 50, maxBuildsPerMonth: 150, storageGb: 25.0, canBuild: true,  isWhiteLabel: true,  priceMonthly: 99 },
];

async function main() {
  // 1. Create subscription plans (idempotent)
  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { planType: plan.planType },
      update: { ...plan },
      create: { ...plan },
    });
  }
  console.log(`✓ ${PLANS.length} subscription plans created/updated`);

  // 2. Create admin tenant + user
  const tenant = await prisma.tenant.upsert({
    where: { id: 'seed-admin-tenant' },
    update: {},
    create: { id: 'seed-admin-tenant', name: 'AppForge HQ' },
  });

  // Production: require SEED_ADMIN_PASSWORD env var. Dev: use a default for local convenience.
  const isProd = process.env.NODE_ENV === 'production';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? (isProd ? '' : 'dev-only-change-me');
  if (isProd && (!adminPassword || adminPassword.length < 12)) {
    console.error('SEED_ADMIN_PASSWORD env var required in production (min 12 chars).');
    console.error('Run: SEED_ADMIN_PASSWORD="$(openssl rand -base64 24)" npx prisma db seed');
    process.exit(1);
  }
  const password = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: 'admin@appforge.com' },
    update: {},
    create: {
      email: 'admin@appforge.com',
      password,
      role: 'SUPER_ADMIN',
      tenantId: tenant.id,
    },
  });

  // 3. Assign FREE plan to admin tenant
  const freePlan = await prisma.subscriptionPlan.findUnique({
    where: { planType: PlanType.FREE },
  });
  if (freePlan) {
    await prisma.subscription.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        planId: freePlan.id,
        expiresAt: new Date('2099-12-31'),
      },
    });
  }

  console.log('✓ Seed completed: admin@appforge.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
