# Coupons — E2E test scripts

Reusable smoke tests for the coupon merchant validation flow.

## Prerequisites

- Backend running on `http://localhost:3000`
- A user account exists (default: `prueba@cavernatecnologica.com` / `123456`)
- That account has at least one App, or this script will create one
- Docker (PostgreSQL + Redis) up

## Running

```bash
# From repo root or from this directory:
node appforge-backend/scripts/e2e/coupons/merchant-flow.mjs
```

## What it covers (16 steps)

1. Login
2. Get or create test app
3. Initial merchant config status (`configured: false`)
4. Setup merchant PIN (`pin: 'test123'`)
5. Status after setup (`configured: true`)
6. Public `/merchant-info` endpoint (no auth)
7. Create test coupon
8. Redeem with wrong PIN → 403
9. Redeem with non-existing code → 404
10a. Successful redeem WITHOUT email (anonymous) → 201, currentUses=1
10b. Redeem with non-registered email → 404 with clear message
11. Verify `currentUses` incremented in DB
12. List redemptions
13. Update PIN (`newpin456`)
14. Old PIN now blocked → 403
15. Brute-force: 11 wrong PINs in a row → 429 lockout triggered
16. Cleanup test coupon

If any step fails, the script exits with code 1.

## After running

The brute-force test (step 15) leaves a Redis lockout entry that expires
automatically after ~15 minutes. To clear immediately:

```bash
APPID="<your-app-id>"
docker exec appforge-redis redis-cli DEL coupon:lockout:$APPID coupon:fails:$APPID
```

## Adding new cases

Append new STEP blocks to `merchant-flow.mjs`. Keep the same pattern:
`req(path, opts)` returns `{ status, body }`. Throw on assertion failure.
