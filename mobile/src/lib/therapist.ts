/**
 * The therapist's own data, read from the backend.
 *
 * Every hook here follows the same rule as the rest of the therapist area: while
 * something is loading or the request fails, screens show their own empty state
 * rather than demo data. A therapist reading an invented session note or a made-up
 * open time would be worse than a blank.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  getGoals,
  getMe,
  getSession,
  getSessionNotes,
  listMySessions,
  saveGoals,
  saveHours,
  saveNotifyPrefs,
  saveProfile,
  saveSessionNotes,
  shareSessionNotes,
  type ApiNotifyPrefs,
  type ApiNoteSuggestion,
  type ApiSession,
  type ApiSessionNotes,
  type ApiTherapistMe,
  type SessionNotesDraft,
  type TherapistProfileDraft,
  type WorkingHoursDraft,
} from '../api/therapist';
import type { SessionNotes } from '../data/practice';

/** The signed-in therapist's profile and hours. `save` returns the error text to show, or null. */
export function useMe() {
  const [me, setMe] = useState<ApiTherapistMe | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    getMe()
      .then(setMe)
      .catch(() => {
        /* offline or signed out: the screen shows its empty state */
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(reload, [reload]);

  const saveDetails = useCallback(async (draft: TherapistProfileDraft): Promise<string | null> => {
    try {
      setMe(await saveProfile(draft));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not save that.';
    }
  }, []);

  const saveWorkingHours = useCallback(async (draft: WorkingHoursDraft): Promise<string | null> => {
    try {
      const hours = await saveHours(draft);
      setMe((prev) => (prev ? { ...prev, hours } : prev));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not save your hours.';
    }
  }, []);

  const saveNotify = useCallback(async (prefs: ApiNotifyPrefs): Promise<string | null> => {
    try {
      setMe(await saveNotifyPrefs(prefs));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not save that.';
    }
  }, []);

  /** Time off is added and removed one entry at a time; both return the new hours. */
  const applyHours = useCallback((hours: ApiTherapistMe['hours']) => {
    setMe((prev) => (prev ? { ...prev, hours } : prev));
  }, []);

  return { me, loading, reload, saveDetails, saveWorkingHours, saveNotify, applyHours };
}

/** One session by id, so the Session screen does not depend on the calendar list. */
export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<ApiSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getSession(sessionId)
      .then((s) => alive && setSession(s))
      .catch(() => {
        /* gone, or not this therapist's: the screen says so */
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  return { session, loading };
}

export const EMPTY_NOTES: SessionNotesDraft = { highlights: [], shared: '', try_at_home: [], working: '' };

/**
 * A session's notes, in the therapist's own two-part view.
 *
 * `save` keeps a draft; `share` is the separate, deliberate step that lets the
 * family read the shared part. Working notes never travel with it.
 */
export function useSessionNotes(sessionId: string | undefined) {
  const [notes, setNotes] = useState<ApiSessionNotes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getSessionNotes(sessionId)
      .then((n) => alive && setNotes(n))
      .catch(() => {
        /* not this therapist's session: the screen shows nothing to write on */
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const save = useCallback(
    async (draft: SessionNotesDraft): Promise<string | null> => {
      if (!sessionId) return 'This session is not on your calendar any more.';
      try {
        setNotes(await saveSessionNotes(sessionId, draft));
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not save these notes.';
      }
    },
    [sessionId],
  );

  const share = useCallback(
    async (draft: SessionNotesDraft): Promise<string | null> => {
      if (!sessionId) return 'This session is not on your calendar any more.';
      try {
        // Save first, so what the family reads is exactly what is on screen.
        await saveSessionNotes(sessionId, draft);
        setNotes(await shareSessionNotes(sessionId));
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not share these notes.';
      }
    },
    [sessionId],
  );

  return { notes, loading, save, share };
}

/** The therapist's goals for one child. Plain sentences, never scores. */
export function useGoals(childId: string | undefined) {
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getGoals(childId)
      .then((g) => alive && setGoals(g.goals))
      .catch(() => {
        /* offline: the card shows "No goals yet" */
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [childId]);

  const save = useCallback(
    async (next: string[]): Promise<string | null> => {
      if (!childId) return 'This client is not in your list.';
      try {
        const saved = await saveGoals(childId, next);
        setGoals(saved.goals);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Could not save these goals.';
      }
    },
    [childId],
  );

  return { goals, loading, save };
}

/** The notes shape the Session screen and NotesPreview already render. */
export function asNotesView(n: ApiSessionNotes, when: (iso: string) => string): SessionNotes {
  return {
    highlights: n.highlights,
    shared: n.shared,
    tryAtHome: n.try_at_home,
    working: n.working,
    sharedAt: n.shared_at ? when(n.shared_at) : null,
  };
}

/** True once there is something written, shared or not. */
export const hasNotes = (n: ApiSessionNotes | null) =>
  !!n && (n.highlights.length > 0 || !!n.shared.trim() || n.try_at_home.length > 0 || !!n.working.trim());

export const draftOf = (n: ApiSessionNotes | null): SessionNotesDraft =>
  n ? { highlights: n.highlights, shared: n.shared, try_at_home: n.try_at_home, working: n.working } : EMPTY_NOTES;

/**
 * The things-to-try from the last session with this child, for the screen the
 * therapist reads *before* the next one. Null while loading, or when the previous
 * session has no notes yet.
 */
export function useLastSuggestions(childId: string | undefined, beforeIso: string | undefined) {
  const [items, setItems] = useState<ApiNoteSuggestion[] | null>(null);

  useEffect(() => {
    if (!childId || !beforeIso) return;
    let alive = true;
    listMySessions()
      .then((sessions) => {
        const previous = sessions
          .filter((s) => s.child_id === childId && s.status !== 'cancelled' && s.start_time < beforeIso)
          .sort((a, b) => b.start_time.localeCompare(a.start_time))[0];
        if (!previous) return null;
        return getSessionNotes(previous.id);
      })
      .then((notes) => {
        if (alive) setItems(notes?.shared_at ? notes.try_at_home : []);
      })
      .catch(() => {
        /* no previous session, or offline: the section stays hidden */
      });
    return () => {
      alive = false;
    };
  }, [childId, beforeIso]);

  return items;
}
