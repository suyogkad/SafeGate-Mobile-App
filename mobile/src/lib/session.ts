/**
 * Where the signed-in session lives on the device.
 *
 * HANDOFF §8 (conflict 2): a child's phone may be shared, inspected or taken, so the
 * device keeps only the session token, Comfort settings and the safety mode -- never
 * messages, transcripts or notes. Those stay on the server.
 *
 * Native uses the keychain/keystore via expo-secure-store. On web there is no such
 * store, so it falls back to localStorage, which is why the web build is for demos
 * and development only.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type Role = 'parent' | 'therapist' | 'child';

export type StoredSession = {
  token: string;
  role: Role;
  /** only for a child session: which child this device is for */
  childId?: string;
};

const KEY = 'safegate.session';

const webStore = {
  get(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* private mode, blocked storage: the session just won't survive a reload */
    }
  },
  remove(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* as above */
    }
  },
};

export async function loadSession(): Promise<StoredSession | null> {
  const raw = Platform.OS === 'web' ? webStore.get(KEY) : await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  const raw = JSON.stringify(session);
  if (Platform.OS === 'web') webStore.set(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') webStore.remove(KEY);
  else await SecureStore.deleteItemAsync(KEY);
}
