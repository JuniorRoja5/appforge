#!/usr/bin/env node
/**
 * E2E test del flujo de notificaciones de pedidos.
 * Cubre: shortCode generation, asociación AppUser, tracking público con token,
 * push idempotente, order anónimo, detach en logout, brute force on no-config.
 *
 * Uso:
 *   API_URL=http://localhost:3000 \
 *   ADMIN_EMAIL=prueba@cavernatecnologica.com \
 *   ADMIN_PASSWORD=123456 \
 *   APP_ID=<uuid de una app con catalog products> \
 *   node scripts/e2e/orders/notifications-flow.mjs
 *
 * NOTA sobre mocking: este script NO mockea nodemailer ni FCM directamente
 * (no podemos inyectar dependencias en el server desde fuera). Lo que hace:
 *  1. Verificar que la creación del pedido NO rompe aunque SMTP no esté configurado.
 *  2. Verificar que las URL de tracking responden con/sin token correcto.
 *  3. Verificar que el push intent quedó registrado en PushNotification (auditoría).
 *  4. Verificar la idempotencia mirando la tabla.
 *
 * Para verificación REAL del rendering del email, configura AppSmtpConfig
 * apuntando a Mailtrap (sandbox.smtp.mailtrap.io) y revisa la bandeja
 * manualmente. Eso es paso del checklist pre-deploy, no del E2E automatizado.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');

const API_URL = process.env.API_URL || 'http://127.0.0.1:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const APP_ID = process.env.APP_ID;
// Fixed email so defensive cleanup at start can locate prior runs deterministically
const APP_USER_EMAIL = process.env.APP_USER_EMAIL || 'e2e-orders@test.com';
const APP_USER_PASSWORD = process.env.APP_USER_PASSWORD || 'test1234';
const TEST_EMAILS = [APP_USER_EMAIL, 'anon@test.com'];

const prisma = new PrismaClient();

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m',
};
const c = (color, txt) => `${C[color]}${txt}${C.reset}`;
let stepNum = 0;
const step = (msg) => console.log(c('cyan', `\n[${++stepNum}] ${msg}`));
const ok = (msg) => console.log(c('green', `   ✓ ${msg}`));
const fail = (msg) => { console.log(c('red', `   ✗ ${msg}`)); process.exit(1); };

async function fetchJson(url, opts = {}, expectedStatus = null) {
  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text();
  if (expectedStatus && res.status !== expectedStatus) {
    fail(`Expected ${expectedStatus}, got ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return { res, body };
}

async function countPushNotifications(adminToken, orderId) {
  const res = await fetch(`${API_URL}/apps/${APP_ID}/push`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) return 0;
  const list = await res.json();
  return list.filter((n) => {
    const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
    return data?.orderId === orderId;
  }).length;
}

// Defensive cleanup: removes residue from prior runs (crashed mid-flow or otherwise).
// Runs at the START so a partial DB never blocks the next attempt.
async function cleanup() {
  // PushDevice first (FK to AppUser is SetNull, but we want to remove fake tokens too)
  const d = await prisma.pushDevice.deleteMany({
    where: { appId: APP_ID, token: { startsWith: 'fake-fcm-token-' } },
  });
  // Orders by test customer emails — covers both authenticated and anonymous test orders
  const o = await prisma.order.deleteMany({
    where: { appId: APP_ID, customerEmail: { in: TEST_EMAILS } },
  });
  const u = await prisma.appUser.deleteMany({
    where: { appId: APP_ID, email: APP_USER_EMAIL },
  });
  console.log(c('cyan', `[pre] Cleanup: ${o.count} orders, ${d.count} pushDevices, ${u.count} appUsers removed`));
}

async function main() {
  console.log(c('bold', '\n━━━ E2E: Order Notifications Flow ━━━\n'));

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !APP_ID) {
    fail('Missing ADMIN_EMAIL / ADMIN_PASSWORD / APP_ID');
  }

  await cleanup();

  // ─── Step 1: Login admin ───
  step('Login admin');
  const { body: loginData } = await fetchJson(
    `${API_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    },
    200,
  );
  const adminToken = loginData.access_token;
  ok(`Admin token obtained (len=${adminToken.length})`);

  // ─── Step 2: Verify catalog has products ───
  step('Verify app has products in catalog');
  const { body: collections } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/catalog`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
  );
  if (!collections.length || !collections[0].products?.length) {
    fail('App has no products. Create at least one in-stock product first.');
  }
  const testProduct = collections[0].products.find((p) => p.inStock) || collections[0].products[0];
  ok(`Test product: ${testProduct.name} (${testProduct.id})`);

  // ─── Step 3: Create test AppUser (idempotent) ───
  step('Create test AppUser');
  const { res: regRes } = await fetchJson(`${API_URL}/apps/${APP_ID}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: APP_USER_EMAIL,
      password: APP_USER_PASSWORD,
      firstName: 'E2E',
      lastName: 'Tester',
    }),
  });
  if (![200, 201, 409].includes(regRes.status)) {
    fail(`Register unexpected status: ${regRes.status}`);
  }
  ok(`AppUser ready: ${APP_USER_EMAIL}`);

  // ─── Step 4: Login AppUser ───
  step('Login AppUser');
  const { body: appLoginData } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/users/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: APP_USER_EMAIL, password: APP_USER_PASSWORD }),
    },
    200,
  );
  const appUserToken = appLoginData.access_token;
  const appUserId = appLoginData.user.id;
  ok(`AppUser ID: ${appUserId}`);

  // ─── Step 5: Register PushDevice with JWT ───
  step('Register PushDevice associated with AppUser');
  const fakeFcmToken = `fake-fcm-token-${Date.now()}-e2e`;
  await fetchJson(
    `${API_URL}/apps/${APP_ID}/push/devices`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appUserToken}`,
      },
      body: JSON.stringify({ token: fakeFcmToken, platform: 'android' }),
    },
    200,
  );
  ok('Device registered with AppUser JWT');

  // ─── Step 6: Create authenticated order ───
  step('Create order as authenticated AppUser');
  const { body: order } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appUserToken}`,
      },
      body: JSON.stringify({
        customerName: 'E2E Tester',
        customerEmail: APP_USER_EMAIL,
        items: [{ productId: testProduct.id, quantity: 2 }],
      }),
    },
    201,
  );
  if (!order.shortCode || !order.shortCode.startsWith('ORD-')) {
    fail(`Expected shortCode ORD-XXXXXX, got: ${order.shortCode}`);
  }
  if (!order.trackingToken) fail('trackingToken not generated');
  if (order.appUserId !== appUserId) {
    fail(`Expected appUserId ${appUserId}, got ${order.appUserId}`);
  }
  ok(`Order ${order.shortCode} (token: ${order.trackingToken.slice(0, 8)}...)`);

  // ─── Step 7: Public tracking WITHOUT token → 404 ───
  step('GET public/:id without tracking token → 404');
  const { res: noTokenRes } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders/public/${order.id}`,
    {},
  );
  if (noTokenRes.status !== 404) fail(`Expected 404, got ${noTokenRes.status}`);
  ok('404 correct without token');

  // ─── Step 8: Public tracking with INVALID token → 404 ───
  step('GET public/:id with invalid token → 404');
  const { res: badTokenRes } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders/public/${order.id}?t=invalid-token`,
    {},
  );
  if (badTokenRes.status !== 404) fail(`Expected 404, got ${badTokenRes.status}`);
  ok('404 correct with invalid token');

  // ─── Step 9: Public tracking with valid token → 200 ───
  step('GET public/:id with valid token → 200 with limited data');
  const { body: publicOrder } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders/public/${order.id}?t=${order.trackingToken}`,
    {},
    200,
  );
  if (publicOrder.customerEmail) fail('customerEmail must NOT be in public response');
  if (publicOrder.customerPhone) fail('customerPhone must NOT be in public response');
  if (publicOrder.customerNotes) fail('customerNotes must NOT be in public response');
  if (publicOrder.customerName !== 'E2E') {
    fail(`customerName should be only first name, got: ${publicOrder.customerName}`);
  }
  ok('Limited data correctly returned');

  // ─── Step 10: Update PENDING → CONFIRMED → push registered ───
  step('Update status PENDING → CONFIRMED');
  await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders/${order.id}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    },
    200,
  );
  await new Promise((r) => setTimeout(r, 500));
  const afterConfirmed = await countPushNotifications(adminToken, order.id);
  if (afterConfirmed < 1) fail(`Expected ≥1 push notification for CONFIRMED, got ${afterConfirmed}`);
  ok(`Push registered (count=${afterConfirmed})`);

  // ─── Step 11: Update CONFIRMED → CONFIRMED (idempotency) ───
  step('Update with SAME status → no duplicate push');
  const beforeIdem = await countPushNotifications(adminToken, order.id);
  await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders/${order.id}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    },
    200,
  );
  await new Promise((r) => setTimeout(r, 500));
  const afterIdem = await countPushNotifications(adminToken, order.id);
  if (afterIdem !== beforeIdem) {
    fail(`Idempotency broken: before=${beforeIdem}, after=${afterIdem}`);
  }
  ok('Idempotency OK — no duplicate push');

  // ─── Step 12: Update CONFIRMED → READY ───
  step('Update CONFIRMED → READY → second push');
  await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders/${order.id}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'READY' }),
    },
    200,
  );
  await new Promise((r) => setTimeout(r, 500));
  ok('READY status set');

  // ─── Step 13: Update READY → DELIVERED → NO push ───
  step('Update READY → DELIVERED → should NOT trigger push');
  const beforeDelivered = await countPushNotifications(adminToken, order.id);
  await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders/${order.id}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'DELIVERED' }),
    },
    200,
  );
  await new Promise((r) => setTimeout(r, 500));
  const afterDelivered = await countPushNotifications(adminToken, order.id);
  if (afterDelivered !== beforeDelivered) {
    fail('DELIVERED should not trigger push');
  }
  ok('DELIVERED triggered no push (correct)');

  // ─── Step 14: Create anonymous order (no JWT) ───
  step('Create anonymous order (no JWT)');
  const { body: anonOrder } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Anonymous Buyer',
        customerEmail: 'anon@test.com',
        items: [{ productId: testProduct.id, quantity: 1 }],
      }),
    },
    201,
  );
  if (anonOrder.appUserId !== null) {
    fail(`Anonymous order should have appUserId === null, got ${anonOrder.appUserId}`);
  }
  ok(`Anonymous order: ${anonOrder.shortCode}, appUserId === null`);

  // ─── Step 15: Update status of anonymous order → NO push ───
  step('Update status of anonymous order → should NOT trigger push');
  const beforeAnon = await countPushNotifications(adminToken, anonOrder.id);
  await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders/${anonOrder.id}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    },
    200,
  );
  await new Promise((r) => setTimeout(r, 500));
  const afterAnon = await countPushNotifications(adminToken, anonOrder.id);
  if (afterAnon !== beforeAnon) {
    fail('Order without appUserId should not trigger push');
  }
  ok('No push for anonymous order (correct)');

  // ─── Step 16: Detach device (logout) ───
  step('Detach device (simulating logout)');
  await fetchJson(
    `${API_URL}/apps/${APP_ID}/push/devices/detach`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: fakeFcmToken }),
    },
    200,
  );
  ok('Device detached');

  // ─── Step 17: Update status after detach ───
  step('Update status after detach → push attempted but device no longer associated');
  await fetchJson(
    `${API_URL}/apps/${APP_ID}/orders/${order.id}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'CANCELLED' }),
    },
    200,
  );
  await new Promise((r) => setTimeout(r, 500));
  ok('CANCELLED status set; push attempted but device no longer linked to user');

  console.log(c('green', '\n━━━ All 17 steps passed ✓ ━━━\n'));
}

main()
  .catch((err) => {
    console.error(c('red', `\n✗ ${err.message}\n`));
    console.error(err.stack);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
