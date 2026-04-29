# Tech debt — pending refactors

Items below are not blocking. Address them in calm windows, not during active feature work.

## 1. nginx.conf structure mismatch — RESOLVED 2026-04-29

The repo previously had a single `nginx.conf` at the root that mixed main-config
directives (`user`, `events`, `http`) with site directives (`server` blocks),
which made it impossible to deploy correctly via `cp` to either location.

**Resolution:** Split into `infra/nginx/nginx.conf` (main) and
`infra/nginx/sites-available/appforge.conf` (site), with deploy instructions in
`infra/nginx/README.md`.

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
