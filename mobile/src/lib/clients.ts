import { useEffect, useState } from 'react';
import { listMyClients, listMySessions, type ApiSession } from '../api/therapist';
import { ALEX_PAST, type SessionNotes } from '../data/practice';
import type { Notification } from '../data/notifications';
import { isOpenUrgent, useApp } from '../store/app';

/**
 * What the therapist knows about each client, in one place, so Clients, Client and
 * Today agree.
 *
 * The caseload and the sessions are real: the backend only ever returns children
 * assigned to this therapist. What a *family* has chosen to share (check-ins, the
 * week's summary) is not built yet, so those fields stay empty rather than showing
 * invented data -- a therapist reading a made-up mood would be worse than a blank.
 */

/** Needs attention: urgent alerts not dealt with, notes still to write, and a family's week shared but not opened yet. */
export const needsAttention = (n: Notification) =>
  n.audience === 'therapist' && !n.resolved && (isOpenUrgent(n) || n.type === 'notesDue' || (n.type === 'shared' && !n.read));

export type ClientSummary = {
  id: string;
  name: string;
  age: string;
  parent: string;
  parentFirst: string;
  /** "Thu 15 Oct · 4:00 pm" */
  next: string | null;
  /** Only once the family shares it; null until then (HANDOFF rule 19). */
  lastCheckin: string | null;
  sharedThisWeek: boolean;
  needsAttention: boolean;
};

const WHEN = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const AT = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function nextSessionLabel(sessions: ApiSession[], childId: string): string | null {
  const now = Date.now();
  const next = sessions
    .filter((s) => s.child_id === childId && s.status === 'booked' && new Date(s.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
  if (!next) return null;
  const start = new Date(next.start_time);
  return `${WHEN.format(start)} · ${AT.format(start)}`;
}

/** The therapist's real sessions, newest arrangement first. Empty while loading. */
export function useTherapistSessions(): ApiSession[] {
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  useEffect(() => {
    let alive = true;
    listMySessions()
      .then((s) => alive && setSessions(s))
      .catch(() => {
        /* offline or signed out: the screens show their empty state */
      });
    return () => {
      alive = false;
    };
  }, []);
  return sessions;
}

export function useClients(): ClientSummary[] {
  const notifications = useApp((s) => s.notifications);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const sessions = useTherapistSessions();

  useEffect(() => {
    let alive = true;
    listMyClients()
      .then((children) => {
        if (!alive) return;
        setClients(
          children
            .filter((c) => !c.archived_at)
            .map((c) => {
              const parent = c.parent_name ?? '';
              return {
                id: c.id,
                name: c.full_name,
                age: '',
                parent,
                parentFirst: parent.split(' ')[0] ?? '',
                next: null,
                // Nothing is shared until the family shares it, and that is not built yet.
                lastCheckin: null,
                sharedThisWeek: false,
                needsAttention: false,
              };
            }),
        );
      })
      .catch(() => {
        /* offline or signed out: Clients shows its empty state */
      });
    return () => {
      alive = false;
    };
  }, []);

  return clients.map((c) => ({
    ...c,
    next: nextSessionLabel(sessions, c.id),
    needsAttention: notifications.some((n) => n.childId === c.id && needsAttention(n)),
  }));
}

/** The newest notes the family has seen (for "Things to try at home" and the parent's Session notes), with its id. */
export function latestSharedId(notes: Record<string, SessionNotes>) {
  return ALEX_PAST.map((b) => b.id).find((i) => notes[i]?.sharedAt) ?? null;
}
export function latestShared(notes: Record<string, SessionNotes>) {
  const id = latestSharedId(notes);
  return id ? notes[id] : null;
}
