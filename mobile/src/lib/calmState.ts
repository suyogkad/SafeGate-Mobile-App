/**
 * The child's side of calm mode.
 *
 * Two things decide what the child sees, and they are deliberately split:
 *
 *  * **The server** says whether something was flagged and what grown-ups have done
 *    about it. That is the only honest source for the truthful line (rule 12) -- the
 *    app cannot know on its own whether a parent has seen it.
 *  * **The device** remembers which one the child has already worked through, so
 *    reopening the app does not drop them back into calm mode they have finished.
 *    HANDOFF §8 allows the safety mode on the device for exactly this reason, and it
 *    is a date, not a message: nothing the child said is stored here.
 *
 * A newer flagged message has a newer `started_at`, so it re-opens calm mode even if
 * the child finished the last one.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { getCalmState, type ApiCalmState } from '../api/child';

const KEY = 'safegate.calm.finished';

async function readFinished(): Promise<string | null> {
  try {
    return Platform.OS === 'web'
      ? (globalThis.localStorage?.getItem(KEY) ?? null)
      : await SecureStore.getItemAsync(KEY);
  } catch {
    // Blocked storage: the child may be shown calm steps again, which is the safe
    // direction. Never the other way round.
    return null;
  }
}

async function writeFinished(startedAt: string): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, startedAt);
    else await SecureStore.setItemAsync(KEY, startedAt);
  } catch {
    /* as above */
  }
}

export async function clearFinishedCalm(): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* as above */
  }
}

/** Mark the calm steps the child has just worked through as done. */
export async function finishCalm(startedAt: string | null | undefined): Promise<void> {
  if (startedAt) await writeFinished(startedAt);
}

/**
 * Should the app be in calm mode right now, according to the server and this device?
 * Returns null while it does not know yet, so nothing flashes on screen.
 */
export async function shouldShowCalm(): Promise<{ show: boolean; state: ApiCalmState } | null> {
  try {
    const state = await getCalmState();
    if (!state.active) return { show: false, state };
    const finished = await readFinished();
    return { show: state.started_at !== finished, state };
  } catch {
    // Offline or signed out: the app keeps whatever it is already showing rather
    // than taking a child out of calm steps on a dropped connection.
    return null;
  }
}

/**
 * The live calm state for the screens that show the truthful line.
 *
 * It re-asks while the screen is open, because the line has to change when a grown-up
 * acts. There is no push yet, so this is a poll; the interval is slow enough to be
 * quiet and quick enough that a child is not left reading the wrong sentence.
 */
export function useCalmState(pollMs = 15000) {
  const [state, setState] = useState<ApiCalmState | null>(null);

  const refresh = useCallback(() => {
    getCalmState()
      .then(setState)
      .catch(() => {
        /* keep the last known line rather than changing what the child reads */
      });
  }, []);

  useEffect(() => {
    refresh();
    if (!pollMs) return;
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  return { state, refresh };
}
