// E2E test for coupon merchant validation flow.
// Run with: node test-coupon-flow.mjs
import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');

const API = 'http://127.0.0.1:3000';

async function req(path, opts = {}) {
  const res = await fetch(API + path, opts);
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  return { status: res.status, body };
}

async function main() {
  console.log('━━━ STEP 1: Login ━━━');
  const login = await req('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'prueba@cavernatecnologica.com', password: '123456' }),
  });
  if (login.status !== 200 && login.status !== 201) {
    throw new Error('Login failed: ' + JSON.stringify(login));
  }
  const token = login.body.access_token;
  console.log('  ✓ Login OK, token len=' + token.length);

  console.log('\n━━━ STEP 2: Get or create test app ━━━');
  const apps = await req('/apps', { headers: { Authorization: 'Bearer ' + token } });
  let app;
  if (apps.body.length === 0) {
    const created = await req('/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ name: 'Test Coupon App', slug: 'test-coupon-app-' + Date.now() }),
    });
    app = created.body;
    console.log('  ✓ Created app:', app.id);
  } else {
    app = apps.body[0];
    console.log('  ✓ Using existing app:', app.id, '—', app.name);
  }
  const appId = app.id;

  console.log('\n━━━ STEP 3: Initial merchant config status ━━━');
  const status1 = await req('/apps/' + appId + '/coupons/merchant-config', {
    headers: { Authorization: 'Bearer ' + token },
  });
  console.log('  status:', status1.status, '| body:', JSON.stringify(status1.body));

  console.log('\n━━━ STEP 4: Setup merchant PIN ━━━');
  const setupRes = await req('/apps/' + appId + '/coupons/merchant-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ pin: 'test123' }),
  });
  console.log('  status:', setupRes.status, '| body:', JSON.stringify(setupRes.body).slice(0, 120));

  console.log('\n━━━ STEP 5: Merchant config status after setup ━━━');
  const status2 = await req('/apps/' + appId + '/coupons/merchant-config', {
    headers: { Authorization: 'Bearer ' + token },
  });
  console.log('  status:', status2.status, '| configured:', status2.body.configured);

  console.log('\n━━━ STEP 6: Public merchant info (no auth) ━━━');
  const publicInfo = await req('/apps/' + appId + '/coupons/merchant-info');
  console.log('  status:', publicInfo.status, '| body:', JSON.stringify(publicInfo.body));

  console.log('\n━━━ STEP 7: Create test coupon ━━━');
  const couponCode = 'TEST' + Math.floor(Math.random() * 10000);
  const created = await req('/apps/' + appId + '/coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({
      title: 'Test Coupon',
      code: couponCode,
      discountType: 'PERCENTAGE',
      discountValue: 20,
    }),
  });
  if (created.status !== 200 && created.status !== 201) {
    throw new Error('Create coupon failed: ' + JSON.stringify(created));
  }
  const coupon = created.body;
  console.log('  ✓ Code:', coupon.code, '| currentUses:', coupon.currentUses);

  console.log('\n━━━ STEP 8: Merchant redeem with WRONG PIN ━━━');
  const wrongPin = await req('/apps/' + appId + '/coupons/merchant-redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: couponCode, pin: 'wrong1' }),
  });
  console.log('  status:', wrongPin.status, '| body:', JSON.stringify(wrongPin.body).slice(0, 120));

  console.log('\n━━━ STEP 9: Merchant redeem with WRONG CODE ━━━');
  const wrongCode = await req('/apps/' + appId + '/coupons/merchant-redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'NOPE12', pin: 'test123' }),
  });
  console.log('  status:', wrongCode.status, '| body:', JSON.stringify(wrongCode.body).slice(0, 120));

  console.log('\n━━━ STEP 10a: Successful merchant redeem (NO email — anonymous) ━━━');
  const redeem = await req('/apps/' + appId + '/coupons/merchant-redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: couponCode, pin: 'test123' }),
  });
  console.log('  status:', redeem.status);
  console.log('  message:', redeem.body.message);
  console.log('  coupon.currentUses returned:', redeem.body.coupon?.currentUses);

  console.log('\n━━━ STEP 10b: Redeem with non-existing email ━━━');
  const redeemBadEmail = await req('/apps/' + appId + '/coupons/merchant-redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: couponCode, pin: 'test123', appUserEmail: 'doesnotexist@test.com' }),
  });
  console.log('  status:', redeemBadEmail.status, '— expected 404 with clear message');
  console.log('  message:', redeemBadEmail.body.message);

  console.log('\n━━━ STEP 11: Verify currentUses incremented in DB ━━━');
  const all = await req('/apps/' + appId + '/coupons', { headers: { Authorization: 'Bearer ' + token } });
  const updated = all.body.find((c) => c.id === coupon.id);
  console.log('  currentUses in DB:', updated.currentUses, '(should be 1)');

  console.log('\n━━━ STEP 12: List redemptions ━━━');
  const redemptions = await req('/apps/' + appId + '/coupons/' + coupon.id + '/redemptions', {
    headers: { Authorization: 'Bearer ' + token },
  });
  console.log('  count:', redemptions.body.length);
  if (redemptions.body.length > 0) {
    console.log('  first redemption appUser:', redemptions.body[0].appUser?.email || '(no user)');
  }

  console.log('\n━━━ STEP 13: Update PIN ━━━');
  const updatePin = await req('/apps/' + appId + '/coupons/merchant-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ pin: 'newpin456' }),
  });
  console.log('  status:', updatePin.status);

  console.log('\n━━━ STEP 14: Old PIN should now fail ━━━');
  const oldPin = await req('/apps/' + appId + '/coupons/merchant-redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: couponCode, pin: 'test123' }),
  });
  console.log('  status:', oldPin.status, '(403 expected — PIN incorrecto)');

  console.log('\n━━━ STEP 15: Brute-force lockout — 11 wrong PINs ━━━');
  const bfResults = [];
  for (let i = 1; i <= 11; i++) {
    const bf = await req('/apps/' + appId + '/coupons/merchant-redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode, pin: 'badpin' }),
    });
    bfResults.push(bf.status);
  }
  console.log('  attempts (1-11):', bfResults.join(','));
  const got429 = bfResults.includes(429);
  console.log('  lockout triggered (429 seen):', got429);
  if (!got429) throw new Error('Expected 429 lockout but never saw it');
  // Lockout is intentionally NOT cleared here — it expires automatically (~15min TTL).
  // To clear manually:
  //   docker exec appforge-redis redis-cli DEL coupon:lockout:<appId> coupon:fails:<appId>

  console.log('\n━━━ STEP 16: Cleanup test coupon ━━━');
  await req('/apps/' + appId + '/coupons/' + coupon.id, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  });
  console.log('  ✓ Coupon deleted');

  console.log('\n✅ ALL TESTS PASSED');
}

main().catch((e) => {
  console.error('\n❌ TEST FAILED:', e.message);
  console.error(e.stack);
  process.exit(1);
});
