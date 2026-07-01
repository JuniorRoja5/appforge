import { z } from 'zod';

/**
 * Phase 3b (Lote B3 — complejos) — user_profile schema.
 *
 * Builder source: appforge-builder/src/modules/user_profile/user-profile.module.tsx
 * Runtime source: appforge-runtime/src/modules/user-profile/UserProfileRuntime.tsx
 *
 * Architectural note: the auth flow (login, registration, session
 * management, JWT lifetime) lives in the backend. This module's
 * schema describes only the client-editable visuals of the
 * login/registration surface.
 *
 * Schema verification (3b checklist):
 *   - 10 top-level fields: enabled, allowRegistration, layout,
 *     requireLogin, loginButtonText, registrationButtonText,
 *     buttonColor, buttonTextColor, appId, _refreshKey ✓
 *   - Zero refinements
 *   - Zero subschemas
 *   - Zero defaults inside Zod
 *   - 2 optionals preserved: appId, _refreshKey ✓
 *   - Zero numeric constraints
 *
 * Legacy fields NOT in schema: none detected.
 * Zombie fields removed: none.
 * Latent hooks: none. This module has no header title.
 */
export const UserProfileConfigSchema = z.object({
  enabled: z.boolean(),
  allowRegistration: z.boolean(),
  layout: z.enum(['classic', 'centered', 'card']),
  requireLogin: z.boolean(),
  loginButtonText: z.string(),
  registrationButtonText: z.string(),
  buttonColor: z.string(),
  buttonTextColor: z.string(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type UserProfileConfig = z.infer<typeof UserProfileConfigSchema>;
