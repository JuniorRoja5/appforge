# Tech debt — pending refactors

Items below are not blocking. Address them in calm windows, not during active feature work.

## 1. nginx.conf structure mismatch

**Problem:** The current `nginx.conf` in this repo contains `user nginx;`, `events {}`, and `http {}` blocks — that is the structure of a **main** nginx config (`/etc/nginx/nginx.conf`), not a **site** config (which only contains `server` blocks).

The header comment says "copy this to `/etc/nginx/sites-available/appforge.conf`", which would create a nested `http {}` inside Ubuntu's default `http {}` and break nginx on reload.

**Fix:** Split the file into two:
- `nginx-main.conf` → goes to `/etc/nginx/nginx.conf` (with `events {}`, `http {}`, gzip, ssl_protocols, rate-limit zones, etc.)
- `appforge-sites.conf` → goes to `/etc/nginx/sites-available/appforge.conf` (only the 5 `server {}` blocks for api/app/admin/storage/marketing)

Update `deploy-setup.sh` to install both files in the correct paths.

**Don't touch this if production is currently working.** Only fix when redeploying nginx config from scratch.

---

## 2. Image upload field — duplicated UX across modules

**Problem:** At least 4 modules implement "image with upload + URL fallback" with slightly different markup, styles, and bugs:
- `events.module.tsx` — was missing the URL input until 2026-04-29
- `news_feed.module.tsx`
- `hero_profile.module.tsx`
- `custom_page/image.module.tsx`

Other modules will need it: `menu_restaurant` (per-item image), `catalog` (per-product), `photo_gallery`, `discount_coupon`, `loyalty_card`...

Each implementation is ~40 duplicated lines with subtle inconsistencies (different button colors, different aspect ratios, different "Subiendo..." copy).

**Fix:** Extract a shared component:

```
appforge-builder/src/components/shared/ImageUploadField.tsx

interface Props {
  value: string;                   // current imageUrl
  onChange: (url: string) => void;
  accentColor?: string;            // Tailwind color name, e.g. 'teal' | 'indigo'
  aspectRatio?: 'video' | 'square' | 'auto';
  label?: string;                  // default: "Imagen (opcional)"
  placeholder?: string;            // URL input placeholder
}
```

Internally encapsulates: preview with X button, URL input, file upload via `uploadImage()` from api.ts, "Subiendo..." state.

Migrate the 4 existing modules one by one. Reduces ~160 lines of duplication and prevents inconsistencies like the events bug.

**When to do this:** After current QA round is done, before adding new modules that need image upload.
