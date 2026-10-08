/** What a parent's own screens read from the backend. */
import { useEffect, useState } from 'react';
import { getSharedNotes, listFamilySessions, type ApiSharedNotes } from '../api/family';
import type { ApiSession } from '../api/therapist';

export function useFamilySessions(): ApiSession[] {
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  useEffect(() => {
    let alive = true;
    listFamilySessions()
      .then((s) => alive && setSessions(s))
      .catch(() => {
        /* offline or signed out: the screen shows its empty state */
      });
    return () => {
      alive = false;
    };
  }, []);
  return sessions;
}

/**
 * The notes a therapist shared for one session. `notes` stays null until they
 * share, which the screen shows as "notes coming" rather than as an error --
 * nothing has gone wrong, the therapist simply has not written them yet.
 */
export function useSharedNotes(sessionId: string | undefined) {
  const [notes, setNotes] = useState<ApiSharedNotes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getSharedNotes(sessionId)
      .then((n) => alive && setNotes(n))
      .catch(() => alive && setNotes(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  return { notes, loading };
}
