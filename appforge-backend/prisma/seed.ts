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

  const password = await bcrypt.hash('admin123', 10);
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
