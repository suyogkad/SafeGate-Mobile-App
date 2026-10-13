/**
 * What the child's own screens read and write.
 *
 * Saving a check-in or a journal entry can come back with `calm: true`, which means
 * the safety layer flagged what the child wrote. The child's app switches to calm
 * steps and is never told why: no level, no score, no classifier output (rule 5).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  myJournal,
  mySessions,
  saveCheckin,
  saveJournalEntry,
  type ApiChildSession,
  type ApiJournalEntry,
} from '../api/child';

/** The child's own journal entries, newest first. */
export function useMyJournal() {
  const [entries, setEntries] = useState<ApiJournalEntry[] | null>(null);

  const reload = useCallback(() => {
    myJournal()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);
  useEffect(reload, [reload]);

  return { entries, reload };
}

/** The child's own sessions, soonest first. */
export function useMySessions() {
  const [sessions, setSessions] = useState<ApiChildSession[] | null>(null);
  useEffect(() => {
    let alive = true;
    mySessions()
      .then((s) => alive && setSessions(s))
      .catch(() => alive && setSessions([]));
    return () => {
      alive = false;
    };
  }, []);
  return sessions;
}

/** The next session the child has coming up, or null. */
export function nextSessionOf(sessions: ApiChildSession[] | null): ApiChildSession | null {
  if (!sessions) return null;
  const now = Date.now();
  return (
    sessions
      .filter((s) => s.status === 'booked' && new Date(s.start_time).getTime() > now)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))[0] ?? null
  );
}

export { saveCheckin, saveJournalEntry };
