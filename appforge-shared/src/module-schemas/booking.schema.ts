import { z } from 'zod';

/**
 * Phase 3b (Lote B3 — complejos) — booking schema.
 *
 * Builder source: appforge-builder/src/modules/booking/booking.module.tsx
 * Runtime source: appforge-runtime/src/modules/booking/BookingRuntime.tsx
 *
 * Architectural note: the booking system (available slots, reservation
 * records, reminders, cancellations) lives in the backend. The schema
 * below describes only the client-editable configuration of the
 * booking widget (form fields, time slots, business rules). Plano 1
 * is entirely untouched.
 *
 * Schema verification (3b checklist) — booking is THE module of the
 * "16 → 15 dropped field" risk, so every count is anchored here:
 *   - 15 top-level fields exactly: title, description, timeSlots,
 *     slotDuration, fields, submitButtonText, cancellationDeadlineHours,
 *     reminder24hEnabled, reminder2hEnabled, availableWeekdays,
 *     bookingHorizonDays, blockedDates, businessAddress, appId,
 *     _refreshKey ✓
 *   - Zero refinements
 *   - 1 subschema (BookingFieldSchema) — EXPORTED separately with 4
 *     fields: id, type (enum 4: text/email/phone/textarea), label,
 *     required. All required inside the subschema. ✓
 *   - Zero defaults inside Zod
 *   - EXACTLY 3 numeric constraints preserved byte-by-byte:
 *       cancellationDeadlineHours.min(1).max(72)
 *       availableWeekdays element.min(0).max(6)
 *       bookingHorizonDays.min(1).max(365)
 *     slotDuration is z.number() bare — NO constraint. Do NOT add
 *     min/max there; adding a constraint that does not exist is as
 *     severe as dropping one. ✓
 *   - 9 optionals preserved: cancellationDeadlineHours,
 *     reminder24hEnabled, reminder2hEnabled, availableWeekdays,
 *     bookingHorizonDays, blockedDates, businessAddress, appId,
 *     _refreshKey ✓
 *
 * Legacy fields NOT in schema (runtime accepts via defensive fallback):
 *   - `data.formFields` → mapped to `fields` (old runtime naming).
 *     The runtime does `normalizeFields(data.fields ?? data.formFields)`;
 *     the fallback is kept for manifests saved before the rename.
 *     Adding `formFields` to the schema would declare a phantom field
 *     the builder no longer emits.
 *
 * Zombie fields removed: none. title is a legit field, editable in the
 * SettingsPanel — the runtime's `(data.title as string) ?? 'Reservar
 * Cita'` reads a declared field, not a latent hook.
 */
export const BookingFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'email', 'phone', 'textarea']),
  label: z.string(),
  required: z.boolean(),
});

export type BookingField = z.infer<typeof BookingFieldSchema>;

export const BookingConfigSchema = z.object({
  title: z.string(),
  description: z.string(),
  timeSlots: z.array(z.string()),
  slotDuration: z.number(),
  fields: z.array(BookingFieldSchema),
  submitButtonText: z.string(),
  cancellationDeadlineHours: z.number().min(1).max(72).optional(),
  reminder24hEnabled: z.boolean().optional(),
  reminder2hEnabled: z.boolean().optional(),
  availableWeekdays: z.array(z.number().min(0).max(6)).optional(),
  bookingHorizonDays: z.number().min(1).max(365).optional(),
  blockedDates: z.array(z.string()).optional(),
  businessAddress: z.string().optional(),
  appId: z.string().optional(),
  _refreshKey: z.number().optional(),
});

export type BookingConfig = z.infer<typeof BookingConfigSchema>;
