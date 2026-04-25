# Security Notes

## Secrets Management

**No real secrets are committed to this repository.** All `.env*` files are gitignored.

### Production secrets generation

Before deploying, generate all secrets fresh on the production server:

```bash
# JWT secrets (64 bytes base64)
echo "JWT_SECRET=$(openssl rand -base64 64)" >> .env
echo "APP_USER_JWT_SECRET=$(openssl rand -base64 64)" >> .env

# Encryption keys (32 bytes hex = 64 chars, required by AES-256-GCM)
echo "SMTP_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
echo "KEYSTORE_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env

# Database password
echo "DB_PASSWORD=$(openssl rand -base64 32)" >> .env

# Session secret
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
```

After generating, set strict permissions:
```bash
chmod 600 .env
chown root:root .env
```

### Stripe / Google / Firebase keys

Get from each provider's dashboard:
- **Stripe**: https://dashboard.stripe.com/apikeys (start with TEST keys)
- **Google OAuth**: https://console.cloud.google.com/apis/credentials
- **Firebase**: https://console.firebase.google.com → Service accounts → Generate new private key

### Admin user password

The Prisma seed script requires `SEED_ADMIN_PASSWORD` env var in production:

```bash
SEED_ADMIN_PASSWORD="$(openssl rand -base64 24)" npx prisma db seed
```

Save the password securely (1Password / Bitwarden) before running. Change it from the admin panel after first login.

## Files NEVER to commit

- `.env`, `.env.local`, `.env.production` (any file ending in `.env`)
- `*.keystore`, `*.jks` (Android signing keys)
- `serviceAccountKey.json` (Firebase admin)
- `google-services.json` (Firebase Android client)
- Any file ending in `-error.txt` or `-error.log` (may contain stack traces with sensitive paths)

All of these are in `.gitignore`.

## What `env.production.example` is for

It's a **template**. All values containing the string `CHANGEME` must be replaced with real generated secrets before the app starts. The backend validates this at boot via the env validation in `appforge-backend/src/main.ts`.

## Reporting security issues

Email security@creatu.app — do not open public GitHub issues.
