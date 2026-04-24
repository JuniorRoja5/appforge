import { Capacitor } from '@capacitor/core';
import { getManifest } from './manifest';

let initialized = false;

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
        await registerDeviceToken(
          manifest.apiUrl,
          manifest.appId,
          token.value,
        );
      } catch (err) {
        console.error('[Push] Failed to register device token:', err);
      }
    });

    // Listen for registration error
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err);
    });

    // Listen for push received in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received in foreground:', notification);
    });

    // Listen for push notification tap
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification tapped:', action);
    });
  } catch (err) {
    console.warn('[Push] Initialization failed (FCM may not be configured):', err);
  }
}

async function registerDeviceToken(
  apiUrl: string,
  appId: string,
  token: string,
): Promise<void> {
  const platform = Capacitor.getPlatform(); // 'android' | 'ios'
  await fetch(`${apiUrl}/apps/${appId}/push/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform }),
  });
}
