# Booking notifications — E2E test

Tests the full lifecycle of booking notifications:

1. shortCode generation (BKG-XXXXXX, unique per app)
2. AppUser association via JWT propagation (when authenticated)
3. Anonymous bookings (no JWT — appUserId is null)
4. Mapping `formData` → columns by `field.type` (first match wins)
5. Public tracking endpoint with anti-enumeration token
6. Customer cancellation via tracking token
7. Merchant cancellation via PUT /status
8. Cancellation deadline enforcement
9. Slot conflict (unique constraint)
10. Idempotent updateStatus

## Prerequisites

- Backend running at `http://localhost:3000`
- Docker stack up (PostgreSQL + Redis)
- An app with the **booking module configured** (timeSlots + fields)

## Usage

```bash
cd appforge-backend
API_URL=http://127.0.0.1:3000 \
ADMIN_EMAIL=prueba@cavernatecnologica.com \
ADMIN_PASSWORD=123456 \
APP_ID=<uuid-of-app-with-booking> \
node scripts/e2e/bookings/notifications-flow.mjs
```

## What it covers — 18 steps

1-3. Setup: admin login, AppUser register/login
4. Read app schema to find fields and timeSlots
5. Create authenticated booking — verify `shortCode`, `trackingToken`, `appUserId`
6. Verify `formData → columns` mapping (customerName, customerEmail, customerPhone, customerNotes)
7. Anonymous booking (no JWT) → `appUserId === null`
8-10. Public tracking: no token → 404, invalid token → 404, valid token → 200 with limited data
11. Customer cancellation via tracking token
12. Verify `cancelledBy === CUSTOMER` and `cancelledAt` set
13. Try to cancel already-cancelled booking → 400
14. Merchant cancellation via PUT /status → `cancelledBy === MERCHANT`
15. Conflict on duplicate slot → 409
16. Idempotent updateStatus (same value → no error)
17. Same-day booking (would skip T-24h job silently)
18. Cleanup

## What it does NOT cover (manual verification needed)

- **Email rendering**: this test does not verify the HTML output. Use Mailtrap.
- **Real push delivery**: no real FCM tokens. Verify `PushNotification` audit row instead.
- **Reminder job execution**: hard to test without manipulating BullMQ from outside. The test creates a same-day booking which would skip T-24h scheduling silently.

For full reminder verification:
1. Create a booking 25 hours in the future via the runtime
2. In Redis, inspect the queue: `docker exec appforge-redis redis-cli KEYS 'bull:booking-reminders:*'`
3. Manually trigger the job by reducing its delay, or wait

## Mailtrap manual verification

1. Configure `AppSmtpConfig` for the test app pointing to `sandbox.smtp.mailtrap.io:2525`
2. Create a booking with a real `customerEmail`
3. Check Mailtrap inbox: should see "Cita confirmada — BKG-XXXXXX" (customer) + "Nueva reserva — BKG-XXXXXX" (merchant)
4. Cancel via tracking page → check inbox for "Cita cancelada por el cliente"

## Cleanup

The test attempts cleanup automatically. Manual SQL fallback:

```sql
DELETE FROM "Booking" WHERE "customerEmail" IN (
  'anon@booking.test', 'first@conflict.test', 'soon@booking.test'
) OR "customerEmail" LIKE 'e2e-bookings-%@test.com';

DELETE FROM "AppUser" WHERE email LIKE 'e2e-bookings-%@test.com';
```
