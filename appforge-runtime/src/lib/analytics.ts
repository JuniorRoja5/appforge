import { Capacitor } from '@capacitor/core';
import { getManifest } from './manifest';
import { getCurrentUser } from './auth';

// ─── Types ──────────────────────────────────────────────────

interface AnalyticsEventPayload {
  sessionId: string;
  eventType: string;
  moduleId?: string;
  platform: string;
  deviceModel?: string;
  osVersion?: string;
  appUserId?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ─── Internal State ─────────────────────────────────────────

let _sessionId: string | null = null;
let _deviceInfo: {
  platform: string;
  model: string;
  osVersion: string;
} | null = null;
let _eventBuffer: AnalyticsEventPayload[] = [];
let _flushTimer: ReturnType<typeof setInterval> | null = null;
let _initialized = false;

// ─── Public API ─────────────────────────────────────────────

/**
 * Initialize analytics tracking. Called after manifest is loaded.
 * Collects device info, starts a session, sets up flush timer,
 * and listens for app lifecycle events.
 */
export async function initAnalytics(): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  // 1. Collect device info
  try {
    if (Capacitor.isNativePlatform()) {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      _deviceInfo = {
        platform: info.platform,
        model: info.model ?? 'unknown',
        osVersion: info.osVersion ?? 'unknown',
      };
    } else {
      _deviceInfo = {
        platform: 'web',
        model: navigator.userAgent.slice(0, 100),
        osVersion: navigator.platform || 'unknown',
      };
    }
  } catch {
    _deviceInfo = { platform: 'web', model: 'unknown', osVersion: 'unknown' };
  }

  // 2. Start first session
  _sessionId = crypto.randomUUID();
  trackEvent('session_start');

  // 3. Flush timer — every 30 seconds
  _flushTimer = setInterval(flushEvents, 30_000);

  // 4. App lifecycle listeners
  if (Capacitor.isNativePlatform()) {
    try {
      const { App: CapApp } = await import('@capacitor/app');
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          // Going to background — end session and flush
          trackEvent('session_end');
          flushEvents();
        } else {
          // Returning to foreground — start new session
          _sessionId = crypto.randomUUID();
          trackEvent('session_start');
        }
      });
    } catch {
      // @capacitor/app not available — ignore
    }
  } else {
    // Web fallback: visibilitychange
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        trackEvent('session_end');
        flushEvents();
      } else if (document.visibilityState === 'visible' && _sessionId) {
        // Start new session on return
        _sessionId = crypto.randomUUID();
        trackEvent('session_start');
      }
    });
  }
}

/**
 * Track a generic analytics event.
 */
export function trackEvent(
  eventType: string,
  moduleId?: string,
  metadata?: Record<string, unknown>,
): void {
  if (!_sessionId || !_deviceInfo) return;

  _eventBuffer.push({
    sessionId: _sessionId,
    eventType,
    moduleId,
    platform: _deviceInfo.platform,
    deviceModel: _deviceInfo.model,
    osVersion: _deviceInfo.osVersion,
    appUserId: getCurrentUser()?.id ?? undefined,
    metadata,
    timestamp: new Date().toISOString(),
  });

  // Auto-flush at 50 events
  if (_eventBuffer.length >= 50) {
    flushEvents();
  }
}

/**
 * Track a module view event. Called when a module renders on screen.
 */
export function trackModuleView(moduleId: string): void {
  trackEvent('module_view', moduleId);
}

// ─── Internal ───────────────────────────────────────────────

async function flushEvents(): Promise<void> {
  if (_eventBuffer.length === 0) return;

  const batch = [..._eventBuffer];
  _eventBuffer = [];

  try {
    const manifest = getManifest();
    if (!manifest) {
      // No manifest — re-queue
      _eventBuffer = [...batch, ..._eventBuffer].slice(0, 200);
      return;
    }

    const response = await fetch(
      `${manifest.apiUrl}/apps/${manifest.appId}/analytics/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      },
    );

    if (!response.ok) {
      // Server error — re-queue (capped at 200)
      _eventBuffer = [...batch, ..._eventBuffer].slice(0, 200);
    }
  } catch {
    // Network error — re-queue (capped at 200 to prevent memory leak)
    _eventBuffer = [...batch, ..._eventBuffer].slice(0, 200);
  }
}
