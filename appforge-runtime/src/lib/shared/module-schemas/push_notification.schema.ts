import { z } from 'zod';

/**
 * Phase 3b (Lote B3 — complejos) — push_notification schema.
 *
 * Builder source: appforge-builder/src/modules/push_notification/push-notification.module.tsx
 * Runtime source: appforge-runtime/src/modules/push-notification/PushNotificationRuntime.tsx
 *
 * Architectural note: FCM tokens, targeting, message delivery and the
 * whole push provider chain live in the backend. This module's schema
 * describes only the client-side gate (enabled toggle and whether to
 * auto-request permission on app open).
 *
 * Schema verification (3b checklist):
 *   - 4 top-level fields: enabled, autoRequestPermission, appId,
 *     _refreshKey ✓
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
export const PushNotificationConfigSchema = z.object({
  enabled: z.boolean(),
  autoRequestPermission: z.boolean(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type PushNotificationConfig = z.infer<typeof PushNotificationConfigSchema>;
