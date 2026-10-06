/**
 * The one way this app talks to the SafeGate backend.
 *
 * Everything goes through `request()` so the session token, error shape and timeout
 * are handled in a single place. Screens never call fetch directly.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { clearSession, loadSession, saveSession, type StoredSession } from './session';

/** Errors a child might see are mapped to the calm error screens, never shown raw (HANDOFF rule 15). */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** A dropped connection, not a refusal: Talk shows its offline state for this. */
export class OfflineError extends Error {}

function defaultBaseUrl(): string {
  // A phone can't reach the laptop's "localhost", so in development fall back to the
  // host Metro is being served from.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (Platform.OS !== 'web' && host) return `http://${host}:8000`;
  return 'http://localhost:8000';
}

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra as any)?.apiUrl ?? defaultBaseUrl();

const TIMEOUT_MS = 15000;
// Audio takes longer to send and transcribe than a JSON round trip.
const UPLOAD_TIMEOUT_MS = 45000;

let cached: StoredSession | null = null;
let loaded = false;

export async function currentSession(): Promise<StoredSession | null> {
  if (!loaded) {
    cached = await loadSession();
    loaded = true;
  }
  return cached;
}

export async function setSession(session: StoredSession): Promise<void> {
  cached = session;
  loaded = true;
  await saveSession(session);
}

export async function endSession(): Promise<void> {
  cached = null;
  loaded = true;
  await clearSession();
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
    if (Array.isArray(body?.detail)) return body.detail.map((d: { msg: string }) => d.msg).join(', ');
  } catch {
    /* not JSON */
  }
  return `Request failed (${res.status})`;
}

type Options = { method?: string; body?: unknown; auth?: boolean; form?: URLSearchParams };

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = true, form } = options;
  const headers: Record<string, string> = {};

  if (auth) {
    const session = await currentSession();
    if (session) headers.Authorization = `Bearer ${session.token}`;
  }
  if (form) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  else if (body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: form ? form.toString() : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new OfflineError('No connection');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && auth) {
    // The token was revoked or expired: forget it so the app returns to Welcome
    // rather than retrying forever with a dead credential.
    await endSession();
  }
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Multipart upload. Content-Type is left to the runtime so the multipart boundary
 * is set correctly; everything else matches `request`. */
export async function upload<T>(path: string, form: FormData): Promise<T> {
  const session = await currentSession();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: session ? { Authorization: `Bearer ${session.token}` } : {},
      body: form,
      signal: controller.signal,
    });
  } catch {
    throw new OfflineError('No connection');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) await endSession();
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
