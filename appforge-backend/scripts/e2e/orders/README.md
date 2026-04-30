# Order notifications — E2E test

Tests the full lifecycle of order notifications:

1. shortCode generation (ORD-XXXXXX, unique per app)
2. AppUser association via JWT propagation
3. Public tracking endpoint with anti-enumeration token
4. Idempotent push hook (only fires when status actually changes)
5. Anonymous order handling (no AppUser, no push)
6. Device detach on logout

## Prerequisites

- Backend running at `http://localhost:3000`
- Docker stack up (PostgreSQL + Redis)
- An app with **at least one product in stock** (open the app in the builder, add a catalog collection + product)
- `DATABASE_URL` reachable (read from `appforge-backend/.env` automatically) — required by the defensive cleanup that runs at the start of each invocation

## Idempotency

The script runs a **defensive cleanup at the start** (Prisma `deleteMany` of test orders, push devices, and the test app user) so a previous crashed run never blocks the next invocation. `APP_USER_EMAIL` is fixed (`e2e-orders@test.com`) so the cleanup can locate prior-run residue deterministically.

## Usage

```bash
cd appforge-backend
API_URL=http://localhost:3000 \
ADMIN_EMAIL=prueba@cavernatecnologica.com \
ADMIN_PASSWORD=123456 \
APP_ID=<uuid-of-app-with-catalog> \
node scripts/e2e/orders/notifications-flow.mjs
```

## What it covers — 17 steps

1-4. Setup: admin login, catalog check, AppUser register/login
5. Register PushDevice with AppUser JWT
6. Create authenticated order — verify `shortCode` and `trackingToken` and that `order.appUserId === appUser.id`
7. Public tracking without `?t=` → 404
8. Public tracking with invalid `?t=` → 404
9. Public tracking with valid `?t=` → 200, returns only first name (no email/phone/notes)
10. PENDING → CONFIRMED → push registered in `PushNotification` table
11. CONFIRMED → CONFIRMED (same status) → idempotency, no duplicate push
12. CONFIRMED → READY → second push
13. READY → DELIVERED → no push (correct, not a relevant milestone)
14. Anonymous order (no JWT) → `appUserId === null`
15. Status update on anonymous order → no push (correct)
16. Detach device (simulating logout)
17. Status change after detach → push attempted but device no longer linked

## What it does NOT cover

- **Email rendering**: this test does not verify the HTML output. To do that:
  1. Configure `AppSmtpConfig` for the test app pointing to Mailtrap (`sandbox.smtp.mailtrap.io`, port 2525)
  2. Run the test
  3. Check the Mailtrap inbox manually for the 2 emails (customer + merchant)
- **Real push delivery**: FCM doesn't accept fake tokens, so step 10 verifies the audit row in `PushNotification` (status=`FAILED` is OK as long as it was attempted), not that a real device received the push.

## Cleanup

The test creates one AppUser and several orders. To remove them:

```sql
DELETE FROM "Order" WHERE "appUserId" IN (
  SELECT id FROM "AppUser" WHERE email LIKE 'e2e-orders-%@test.com'
);
DELETE FROM "PushDevice" WHERE "appUserId" IN (
  SELECT id FROM "AppUser" WHERE email LIKE 'e2e-orders-%@test.com'
);
DELETE FROM "AppUser" WHERE email LIKE 'e2e-orders-%@test.com';
DELETE FROM "Order" WHERE "customerEmail" = 'anon@test.com';
```
