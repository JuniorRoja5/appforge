import { Capacitor } from '@capacitor/core';
import { Prefs as Preferences } from './platform';
import { getManifest } from './manifest';
import { getCurrentFcmToken, registerPushDevice, detachPushDeviceFromUser } from './push';

const TOKEN_KEY = 'appforge_user_token';
const USER_KEY = 'appforge_user_data';

export interface AppUserData {
  id: string;
  appId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string;
}

let _token: string | null = null;
let _user: AppUserData | null = null;
const _listeners: Array<(user: AppUserData | null) => void> = [];

function notify() {
  _listeners.forEach((fn) => fn(_user));
}

function getApiUrl(): string {
  return getManifest()?.apiUrl ?? 'http://localhost:3000';
}

function getAppId(): string {
  return getManifest()?.appId ?? '';
}

// ──────────── Public API ────────────

export function getToken(): string | null {
  return _token;
}

export function getCurrentUser(): AppUserData | null {
  return _user;
}

export function isAuthenticated(): boolean {
  return _token !== null && _user !== null;
}

export function onAuthChange(fn: (user: AppUserData | null) => void): () => void {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

export async function initAuth(): Promise<void> {
  try {
    const { value: storedToken } = await Preferences.get({ key: TOKEN_KEY });
    const { value: storedUser } = await Preferences.get({ key: USER_KEY });

    if (!storedToken || !storedUser) return;

    _token = storedToken;
    _user = JSON.parse(storedUser);

    // Validate token is still valid
    const res = await fetch(`${getApiUrl()}/apps/${getAppId()}/users/me`, {
      headers: { Authorization: `Bearer ${_token}` },
    });

    if (!res.ok) {
      // Token expired or invalid
      await clearSession();
      return;
    }

    _user = await res.json();
    await Preferences.set({ key: USER_KEY, value: JSON.stringify(_user) });
    notify();
  } catch {
    await clearSession();
  }
}

export async function register(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
): Promise<AppUserData> {
  const res = await fetch(`${getApiUrl()}/apps/${getAppId()}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Error al registrarse');
  }

  const data = await res.json();
  await saveSession(data.access_token, data.user);
  await reassociateDeviceWithUser();
  return data.user;
}

export async function login(email: string, password: string): Promise<AppUserData> {
  const res = await fetch(`${getApiUrl()}/apps/${getAppId()}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Credenciales inválidas');
  }

  const data = await res.json();
  await saveSession(data.access_token, data.user);
  await reassociateDeviceWithUser();
  return data.user;
}

export async function updateProfile(updates: {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}): Promise<AppUserData> {
  if (!_token) throw new Error('No autenticado');

  const res = await fetch(`${getApiUrl()}/apps/${getAppId()}/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${_token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Error al actualizar perfil');
  }

  const user = await res.json();
  _user = user;
  await Preferences.set({ key: USER_KEY, value: JSON.stringify(user) });
  notify();
  return user;
}

export async function logout(): Promise<void> {
  // Best-effort server-side logout
  if (_token) {
    fetch(`${getApiUrl()}/apps/${getAppId()}/users/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${_token}` },
    }).catch(() => {});
  }
  await clearSession();
}

// ──────────── Private helpers ────────────

async function saveSession(token: string, user: AppUserData): Promise<void> {
  _token = token;
  _user = user;
  await Preferences.set({ key: TOKEN_KEY, value: token });
  await Preferences.set({ key: USER_KEY, value: JSON.stringify(user) });
  notify();
}

async function clearSession(): Promise<void> {
  // Detach device from this AppUser BEFORE clearing the token
  // (the detach endpoint doesn't need auth, so order doesn't matter for the request,
  // but we want to capture the token while it's still in memory if needed elsewhere)
  try {
    const fcmToken = await getCurrentFcmToken();
    if (fcmToken) {
      await detachPushDeviceFromUser(fcmToken);
    }
  } catch {
    /* ignore — never block logout because of push housekeeping */
  }

  _token = null;
  _user = null;
  await Preferences.remove({ key: TOKEN_KEY });
  await Preferences.remove({ key: USER_KEY });
  notify();
}

/**
 * After a successful login, re-register the current FCM token so the device
 * gets associated with the newly authenticated AppUser. No-op if no FCM token
 * (web context, push module disabled, or permission not granted yet).
 */
async function reassociateDeviceWithUser(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const fcmToken = await getCurrentFcmToken();
    if (fcmToken) {
      await registerPushDevice(fcmToken, Capacitor.getPlatform());
    }
  } catch {
    /* ignore — push association is best-effort */
  }
}
