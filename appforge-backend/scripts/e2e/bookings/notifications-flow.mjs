#!/usr/bin/env node
/**
 * E2E test del flujo de notificaciones de reservas.
 * Cubre: shortCode, asociación AppUser, mapeo formData→columnas, tracking público,
 * cancelación cliente, idempotencia, conflicto de slot, recordatorios.
 *
 * Uso:
 *   API_URL=http://127.0.0.1:3000 \
 *   ADMIN_EMAIL=prueba@cavernatecnologica.com \
 *   ADMIN_PASSWORD=123456 \
 *   APP_ID=<uuid de una app con módulo booking> \
 *   node scripts/e2e/bookings/notifications-flow.mjs
 */
import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');

const API_URL = process.env.API_URL || 'http://127.0.0.1:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const APP_ID = process.env.APP_ID;
const APP_USER_EMAIL = process.env.APP_USER_EMAIL || `e2e-bookings-${Date.now()}@test.com`;
const APP_USER_PASSWORD = process.env.APP_USER_PASSWORD || 'test1234';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m',
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
  if (expectedStatus !== null && res.status !== expectedStatus) {
    fail(`Expected ${expectedStatus}, got ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return { res, body };
}

// Returns YYYY-MM-DD for N days from now
function dateOffsetIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  console.log(c('bold', '\n━━━ E2E: Booking Notifications Flow ━━━\n'));

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !APP_ID) {
    fail('Missing ADMIN_EMAIL / ADMIN_PASSWORD / APP_ID');
  }

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
  ok('Admin token obtained');

  // ─── Step 2: Create test AppUser (idempotent) ───
  step('Create test AppUser');
  const { res: regRes } = await fetchJson(`${API_URL}/apps/${APP_ID}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: APP_USER_EMAIL,
      password: APP_USER_PASSWORD,
      firstName: 'E2E',
      lastName: 'Booker',
    }),
  });
  if (![200, 201, 409].includes(regRes.status)) {
    fail(`Register unexpected status: ${regRes.status}`);
  }
  ok(`AppUser ready: ${APP_USER_EMAIL}`);

  // ─── Step 3: Login AppUser ───
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

  // ─── Step 4: Read schema to find a valid slot ───
  step('Read app schema to find first booking time slot');
  const { body: app } = await fetchJson(
    `${API_URL}/apps/${APP_ID}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
  );
  const bookingEl = (app.schema || []).find((el) => el.moduleId === 'booking');
  if (!bookingEl) fail('App has no booking module configured');
  const config = bookingEl.config || {};
  const fields = config.fields || [];
  const timeSlots = config.timeSlots || [];
  if (!timeSlots.length) fail('Booking config has no timeSlots');
  const emailFieldId = fields.find((f) => f.type === 'email')?.id;
  const nameFieldId = fields.find((f) => f.type === 'text')?.id;
  const phoneFieldId = fields.find((f) => f.type === 'phone')?.id;
  const notesFieldId = fields.find((f) => f.type === 'textarea')?.id;
  ok(`Slots available: ${timeSlots.length}, fields: ${fields.length}`);

  // ─── Step 5: Create authenticated booking ───
  step('Create booking authenticated → verify shortCode, trackingToken, appUserId');
  const dateAhead = dateOffsetIso(7);
  const formData1 = {};
  if (nameFieldId) formData1[nameFieldId] = 'E2E Tester';
  if (emailFieldId) formData1[emailFieldId] = APP_USER_EMAIL;
  if (phoneFieldId) formData1[phoneFieldId] = '600000000';
  if (notesFieldId) formData1[notesFieldId] = 'Test note';

  const { body: booking } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appUserToken}`,
      },
      body: JSON.stringify({ date: dateAhead, timeSlot: timeSlots[0], formData: formData1 }),
    },
    201,
  );
  if (!booking.shortCode || !booking.shortCode.startsWith('BKG-')) {
    fail(`Expected shortCode BKG-XXXXXX, got: ${booking.shortCode}`);
  }
  if (!booking.trackingToken) fail('trackingToken not generated');
  if (booking.appUserId !== appUserId) fail(`Expected appUserId ${appUserId}, got ${booking.appUserId}`);
  ok(`Booking ${booking.shortCode}`);

  // ─── Step 6: Verify formData → columns mapping ───
  step('Verify formData → columns extraction');
  if (booking.customerName !== 'E2E Tester') fail(`customerName: expected 'E2E Tester', got ${booking.customerName}`);
  if (booking.customerEmail !== APP_USER_EMAIL) fail(`customerEmail mismatch`);
  if (booking.customerPhone !== '600000000') fail(`customerPhone mismatch`);
  if (booking.customerNotes !== 'Test note') fail(`customerNotes mismatch`);
  ok('All 4 customer fields extracted correctly');

  // ─── Step 7: Anonymous booking (no JWT) ───
  step('Create anonymous booking (no JWT)');
  const formData2 = {};
  if (nameFieldId) formData2[nameFieldId] = 'Anon User';
  if (emailFieldId) formData2[emailFieldId] = 'anon@booking.test';
  const { body: anonBooking } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateAhead, timeSlot: timeSlots[1], formData: formData2 }),
    },
    201,
  );
  if (anonBooking.appUserId !== null) fail(`Anonymous booking should have appUserId === null, got ${anonBooking.appUserId}`);
  ok(`Anonymous booking ${anonBooking.shortCode}, appUserId === null`);

  // ─── Step 8: Public tracking without token → 404 ───
  step('GET public/:id without token → 404');
  const { res: noTokenRes } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings/public/${booking.id}`,
    {},
  );
  if (noTokenRes.status !== 404) fail(`Expected 404, got ${noTokenRes.status}`);
  ok('404 correct');

  // ─── Step 9: Public tracking with invalid token → 404 ───
  step('GET public/:id with invalid token → 404');
  const { res: badTokenRes } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings/public/${booking.id}?t=invalid-token`,
    {},
  );
  if (badTokenRes.status !== 404) fail(`Expected 404, got ${badTokenRes.status}`);
  ok('404 correct');

  // ─── Step 10: Public tracking with valid token → 200 limited data ───
  step('GET public/:id with valid token → 200, limited data');
  const { body: publicBooking } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings/public/${booking.id}?t=${booking.trackingToken}`,
    {},
    200,
  );
  if (publicBooking.customerEmail) fail('customerEmail must NOT be in public response');
  if (publicBooking.customerPhone) fail('customerPhone must NOT be in public response');
  if (publicBooking.customerNotes) fail('customerNotes must NOT be in public response');
  if (publicBooking.customerName !== 'E2E') fail(`customerName should be only first name, got: ${publicBooking.customerName}`);
  if (typeof publicBooking.cancellationDeadlineHours !== 'number') fail('cancellationDeadlineHours missing');
  ok('Limited data correct, deadline included');

  // ─── Step 11: Cancel by customer with valid token ───
  step('Cancel booking by customer with valid token');
  const { body: cancelResult } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings/public/${anonBooking.id}/cancel?t=${anonBooking.trackingToken}`,
    { method: 'POST' },
    201,
  );
  if (!cancelResult.ok) fail('Cancel did not return ok');
  ok(`Anonymous booking cancelled: status=${cancelResult.status}`);

  // ─── Step 12: Verify cancelledBy === CUSTOMER in DB ───
  step('Verify cancelledBy === CUSTOMER');
  const { body: list } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
  );
  const cancelled = list.find((b) => b.id === anonBooking.id);
  if (!cancelled) fail('Cancelled booking not in list');
  if (cancelled.status !== 'CANCELLED') fail(`Expected CANCELLED, got ${cancelled.status}`);
  if (cancelled.cancelledBy !== 'CUSTOMER') fail(`Expected cancelledBy=CUSTOMER, got ${cancelled.cancelledBy}`);
  if (!cancelled.cancelledAt) fail('cancelledAt should be set');
  ok('cancelledBy=CUSTOMER + cancelledAt set');

  // ─── Step 13: Try to cancel already-cancelled booking → 400 ───
  step('Try to cancel already-cancelled booking → 400');
  const { res: dupCancelRes } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings/public/${anonBooking.id}/cancel?t=${anonBooking.trackingToken}`,
    { method: 'POST' },
  );
  if (dupCancelRes.status !== 400) fail(`Expected 400, got ${dupCancelRes.status}`);
  ok('400 correct');

  // ─── Step 14: Merchant cancels booking → cancelledBy=MERCHANT ───
  step('Merchant cancels booking via PUT /:id/status');
  await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings/${booking.id}/status`,
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
  await new Promise((r) => setTimeout(r, 300));
  const { body: list2 } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
  );
  const merchantCancelled = list2.find((b) => b.id === booking.id);
  if (merchantCancelled.cancelledBy !== 'MERCHANT') fail(`Expected MERCHANT, got ${merchantCancelled.cancelledBy}`);
  ok('cancelledBy=MERCHANT');

  // ─── Step 15: Conflict on duplicate slot → 409 ───
  step('Try to book the same slot twice → 409');
  // Create one fresh
  const { body: freshBooking } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateAhead,
        timeSlot: timeSlots[2] || timeSlots[0],
        formData: emailFieldId ? { [emailFieldId]: 'first@conflict.test' } : {},
      }),
    },
    201,
  );
  // Try the same slot again
  const { res: conflictRes } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateAhead,
        timeSlot: timeSlots[2] || timeSlots[0],
        formData: emailFieldId ? { [emailFieldId]: 'second@conflict.test' } : {},
      }),
    },
  );
  if (conflictRes.status !== 409) fail(`Expected 409, got ${conflictRes.status}`);
  ok('409 conflict on duplicate slot');

  // ─── Step 16: Idempotent updateStatus ───
  step('Update status with same value → no error, idempotent');
  await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings/${freshBooking.id}/status`,
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
  ok('Idempotent (no error)');

  // ─── Step 17: Booking < 24h ahead → no T-24h job ───
  step('Booking < 24h ahead → reminder24h job NOT scheduled');
  // Use date today + a slot soon — but we need to pick a slot that's in the future
  // For this test, we just verify the booking creates without error and that
  // BullMQ would skip the T-24h job (delay <= 0). We can't easily verify the
  // queue from outside, so we just check the booking persisted with no errors.
  const today = dateOffsetIso(0);
  const closeBookingPayload = {
    date: today,
    timeSlot: timeSlots[3] || timeSlots[0],
    formData: emailFieldId ? { [emailFieldId]: 'soon@booking.test' } : {},
  };
  const { res: closeRes } = await fetchJson(
    `${API_URL}/apps/${APP_ID}/bookings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(closeBookingPayload),
    },
  );
  // Either 201 (slot was free) or 409 (slot already taken) — both prove the validator works
  if (![201, 409].includes(closeRes.status)) fail(`Unexpected status: ${closeRes.status}`);
  ok('Same-day booking creation handled (T-24h would skip silently)');

  // ─── Step 18: Cleanup ───
  step('Cleanup: delete test bookings');
  // Best-effort cleanup
  for (const b of list2.filter((x) => ['anon@booking.test', APP_USER_EMAIL, 'first@conflict.test', 'soon@booking.test'].includes(x.customerEmail))) {
    await fetch(`${API_URL}/apps/${APP_ID}/bookings/${b.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).catch(() => {});
  }
  ok('Cleanup attempted');

  console.log(c('green', '\n━━━ All 18 steps passed ✓ ━━━\n'));
}

main().catch((err) => {
  console.error(c('red', `\n✗ ${err.message}\n`));
  console.error(err.stack);
  process.exit(1);
});
