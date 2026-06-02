import { BuildType } from '@prisma/client';
import {
  countsTowardQuota,
  requiresAndroidConfig,
  requiresFcmIfPushModulePresent,
  QUOTA_COUNTING_BUILD_TYPES,
} from '../lib/build-type-traits';

describe('build-type-traits', () => {
  describe('countsTowardQuota', () => {
    it('cuenta RELEASE, AAB e IOS_EXPORT', () => {
      expect(countsTowardQuota(BuildType.RELEASE)).toBe(true);
      expect(countsTowardQuota(BuildType.AAB)).toBe(true);
      expect(countsTowardQuota(BuildType.IOS_EXPORT)).toBe(true);
    });

    it('NO cuenta DEBUG ni PWA', () => {
      expect(countsTowardQuota(BuildType.DEBUG)).toBe(false);
      expect(countsTowardQuota(BuildType.PWA)).toBe(false);
    });
  });

  describe('requiresAndroidConfig', () => {
    it('requiere para los tres targets Android (DEBUG, RELEASE, AAB)', () => {
      expect(requiresAndroidConfig(BuildType.DEBUG)).toBe(true);
      expect(requiresAndroidConfig(BuildType.RELEASE)).toBe(true);
      expect(requiresAndroidConfig(BuildType.AAB)).toBe(true);
    });

    it('NO requiere para IOS_EXPORT ni PWA', () => {
      expect(requiresAndroidConfig(BuildType.IOS_EXPORT)).toBe(false);
      expect(requiresAndroidConfig(BuildType.PWA)).toBe(false);
    });
  });

  describe('requiresFcmIfPushModulePresent', () => {
    it('requiere para los builds nativos finales (RELEASE, AAB, IOS_EXPORT)', () => {
      expect(requiresFcmIfPushModulePresent(BuildType.RELEASE)).toBe(true);
      expect(requiresFcmIfPushModulePresent(BuildType.AAB)).toBe(true);
      expect(requiresFcmIfPushModulePresent(BuildType.IOS_EXPORT)).toBe(true);
    });

    it('NO requiere para DEBUG (stub push.ts) ni PWA (Web Push, no Capacitor)', () => {
      expect(requiresFcmIfPushModulePresent(BuildType.DEBUG)).toBe(false);
      expect(requiresFcmIfPushModulePresent(BuildType.PWA)).toBe(false);
    });
  });

  describe('drift entre la función y el array exportado', () => {
    // Blindaje contra "test que pasa trivialmente". Si la transpilación
    // del enum acabara devolviendo vacío (rareza de runtime con el client
    // de Prisma), el forEach iteraría cero veces y el test pasaría sin
    // probar nada. Este expect.toBe(5) lo caza.
    it('Object.values(BuildType) tiene exactamente 5 valores', () => {
      expect(Object.values(BuildType).length).toBe(5);
    });

    it('QUOTA_COUNTING_BUILD_TYPES.includes(t) === countsTowardQuota(t) para los 5 tipos', () => {
      Object.values(BuildType).forEach((t) => {
        expect(QUOTA_COUNTING_BUILD_TYPES.includes(t)).toBe(countsTowardQuota(t));
      });
    });
  });
});
