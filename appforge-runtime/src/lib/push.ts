import { Capacitor } from '@capacitor/core';
import { getManifest } from './manifest';
import { Prefs } from './platform';

let initialized = false;
const FCM_TOKEN_KEY = 'appforge_fcm_token';
// Same key as auth.ts uses — we read it directly to avoid circular import auth ↔ push.
const AUTH_TOKEN_KEY = 'appforge_user_token';

async function readAuthToken(): Promise<string | null> {
  try {
    const { value } = await Prefs.get({ key: AUTH_TOKEN_KEY });
    return value;
  } catch {
    return null;
  }
}

/**
 * Initialize push notifications if the app has the push_notification module.
 * Called after manifest is loaded. Safe to call on web (no-op).
 */
export async function initPush(): Promise<void> {
  if (initialized) return;

  // Only run on native platforms (Android/iOS)
  if (!Capacitor.isNativePlatform()) return;

  const manifest = getManifest();
  if (!manifest) return;

  // Check if push_notification module is in the schema
  const hasPushModule = manifest.schema.some(
    (el) => el.moduleId === 'push_notification',
  );
  if (!hasPushModule) return;

  initialized = true;

  try {
    // Dynamic import to avoid loading on web
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.warn('[Push] Permission not granted');
      return;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Listen for successful registration
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Device token:', token.value);
      try {
        await Prefs.set({ key: FCM_TOKEN_KEY, value: token.value });
        await registerPushDevice(token.value, Capacitor.getPlatform());
      } catch (err) {
        console.error('[Push] Failed to register device token:', err);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received in foreground:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification tapped:', action);
    });
  } catch (err) {
    console.warn('[Push] Initialization failed (FCM may not be configured):', err);
  }
}

/**
 * Returns the cached FCM token from Preferences (set during initPush).
 * Returns null if no token is registered yet (web context, no permission, etc).
 */
export async function getCurrentFcmToken(): Promise<string | null> {
  try {
    const { value } = await Prefs.get({ key: FCM_TOKEN_KEY });
    return value;
  } catch {
    return null;
  }
}

/**
 * Registers (or re-registers) a device token with the backend, including the
 * AppUser JWT if there's an active session. Used both at first registration
 * and after login (to associate the device with the newly logged-in user).
 */
export async function registerPushDevice(token: string, platform: string): Promise<void> {
  const manifest = getManifest();
  if (!manifest) return;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const jwt = await readAuthToken();
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  await fetch(`${manifest.apiUrl}/apps/${manifest.appId}/push/devices`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token, platform }),
  }).catch(() => {});
}

/**
 * Disassociates the device from any AppUser. Called from auth.clearSession()
 * during logout, so the next user that logs in on this device starts clean.
 */
export async function detachPushDeviceFromUser(token: string): Promise<void> {
  const manifest = getManifest();
  if (!manifest || !token) return;

  await fetch(`${manifest.apiUrl}/apps/${manifest.appId}/push/devices/detach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {});
}
