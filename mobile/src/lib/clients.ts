import { ALEX_PAST, CLIENTS, OTHER_CLIENT_SHARING, type ClientId, type SessionNotes } from '../data/practice';
import type { Notification } from '../data/notifications';
import { mood as moodById } from '../data/moods';
import { isOpenUrgent, useApp, useBookings, useChildName } from '../store/app';
import { DEMO_TODAY, dayShort, timeLabel } from './schedule';

/**
 * What the therapist knows about each client, in one place, so Clients, Client and Today agree.
 * Only what the family shares (rule 19): Alex's check-ins show only after Jordan shares the week.
 */

/** Needs attention: urgent alerts not dealt with, notes still to write, and a family's week shared but not opened yet. */
export const needsAttention = (n: Notification) =>
  n.audience === 'therapist' && !n.resolved && (isOpenUrgent(n) || n.type === 'notesDue' || (n.type === 'shared' && !n.read));

export type ClientSummary = {
  id: ClientId;
  name: string;
  age: string;
  parent: string;
  parentFirst: string;
  /** "Thu 15 Oct · 4:00 pm" */
  next: string | null;
  /** "Ok · Today" (the mood word first), or null when nothing is shared */
  lastCheckin: string | null;
  sharedThisWeek: boolean;
  needsAttention: boolean;
};

export function useClients(): ClientSummary[] {
  const childName = useChildName();
  const bookings = useBookings();
  const notifications = useApp((s) => s.notifications);
  const sharedWeek = useApp((s) => s.sharedWeek);
  const checkin = useApp((s) => s.checkin);

  return (Object.keys(CLIENTS) as ClientId[]).map((id) => {
    const c = CLIENTS[id];
    const next = bookings.find((b) => b.clientId === id && b.date > DEMO_TODAY);
    const other = id === 'alex' ? null : OTHER_CLIENT_SHARING[id];
    return {
      id,
      name: id === 'alex' ? childName : c.name,
      age: c.age,
      parent: c.parent,
      parentFirst: c.parentFirst,
      next: next ? `${dayShort(next.date)} · ${timeLabel(next.start)}` : null,
      lastCheckin: id === 'alex' ? (sharedWeek ? `${moodById(checkin?.mood ?? 'ok').label} · Today` : null) : other!.lastCheckin,
      sharedThisWeek: id === 'alex' ? sharedWeek : other!.sharedThisWeek,
      needsAttention: notifications.some((n) => n.childId === id && needsAttention(n)),
    };
  });
}

/** The newest notes the family has seen (for "Things to try at home" and the parent's Session notes), with its id. */
export function latestSharedId(notes: Record<string, SessionNotes>) {
  return ALEX_PAST.map((b) => b.id).find((i) => notes[i]?.sharedAt) ?? null;
}
export function latestShared(notes: Record<string, SessionNotes>) {
  const id = latestSharedId(notes);
  return id ? notes[id] : null;
}
