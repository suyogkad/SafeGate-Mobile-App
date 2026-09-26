import type { ImageSourcePropType } from 'react-native';
import type { BadgeTone } from '../components/ui/Badge';
import { artTints } from '../theme/tokens';
import { FACES } from './faces';

/**
 * Notifications for the grown-ups: the parent (bell, Home "Updates", Notifications) and the therapist (bell on
 * Today, "Needs attention", Notifications). Live events add to the seeded history below.
 * Badges and counts exist only for grown-ups, never in the child app.
 * TODO(safegate): the backend creates these and sends the phone pushes (`push`); the app only lists them.
 */
export type NotificationType =
  | 'calm'
  | 'help'
  | 'emergency'
  | 'checkin'
  | 'journal'
  | 'booking'
  | 'reminder'
  | 'notes'
  | 'week'
  | 'linked'
  | 'shared'
  | 'parentNote'
  | 'notesDue'
  | 'childNote';

export type NotificationAudience = 'parent' | 'therapist';

/** Groups on the Notifications screen. The demo day is Sunday 11 October. */
export type NotificationDay = 'today' | 'yesterday' | 'earlier';

export type Notification = {
  id: string;
  type: NotificationType;
  audience: NotificationAudience;
  /** the child it's about (a therapist has several clients) */
  childId: string;
  title: string;
  detail: string;
  /** "8:10 am" today, "6:30 pm" yesterday, "Fri 9 Oct" earlier */
  when: string;
  day: NotificationDay;
  href: string;
  /** what opening it does, for the row's label ("Open check-ins") */
  opens: string;
  urgent: boolean;
  /** sent to the phone as well as listed (quiet updates are listed only) */
  push: boolean;
  read: boolean;
  /** urgent items: the parent has acted on it (I've seen this), so it leaves "Needs you" */
  resolved?: boolean;
  /** check-ins show the mood's own face */
  face?: ImageSourcePropType;
  tint?: string;
};

/** Tag and picture per type; the same pictures as "Today with Alex". Urgent ones use the bell in amber instead. */
export const NOTIFICATION_LOOK: Record<NotificationType, { tag: string; tone: BadgeTone; face?: ImageSourcePropType; tint?: string }> = {
  calm: { tag: 'NEEDS YOU', tone: 'warn' },
  help: { tag: 'NEEDS YOU', tone: 'warn' },
  checkin: { tag: 'CHECK IN', tone: 'neutral', face: FACES.flatStarburst, tint: artTints.blue },
  journal: { tag: 'JOURNAL', tone: 'neutral', face: FACES.smilePillPink, tint: artTints.yellow },
  booking: { tag: 'SESSION', tone: 'info', face: FACES.glassesSquare, tint: artTints.blue },
  reminder: { tag: 'SESSION', tone: 'info', face: FACES.glassesSquare, tint: artTints.blue },
  notes: { tag: 'NOTES', tone: 'info', face: FACES.smileFlower, tint: artTints.green },
  week: { tag: 'WEEK', tone: 'neutral', face: FACES.smileBlobCyan, tint: artTints.cyan },
  linked: { tag: 'PHONE', tone: 'success', face: FACES.coolArch, tint: artTints.lavender },
  emergency: { tag: 'NEEDS YOU', tone: 'warn' },
  shared: { tag: 'SHARED', tone: 'success', face: FACES.smileBlobCyan, tint: artTints.cyan },
  parentNote: { tag: 'NOTE', tone: 'info', face: FACES.crownEgg, tint: artTints.amber },
  notesDue: { tag: 'NOTES', tone: 'info', face: FACES.smileFlower, tint: artTints.green },
  childNote: { tag: 'MESSAGE', tone: 'info', face: FACES.smileBlobCyan, tint: artTints.cyan },
};

/** Which filter each type belongs to on the Notifications screen. */
export const SESSION_TYPES: NotificationType[] = ['booking', 'reminder', 'notes', 'notesDue'];

/** Seeded history (newest first). Badge at the start of the demo: 2. */
export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'seed-checkin',
    type: 'checkin',
    audience: 'parent',
    childId: 'alex',
    title: 'Alex checked in: Ok',
    detail: 'Words: Calm, Tired · About: School',
    when: '8:10 am',
    day: 'today',
    href: '/parent/checkins?range=Day',
    opens: 'Open check-ins',
    urgent: false,
    push: false,
    read: false,
  },
  {
    id: 'seed-reminder',
    type: 'reminder',
    audience: 'parent',
    childId: 'alex',
    title: 'Session with Priya on Thursday',
    detail: '4:00 pm · Video call',
    when: '7:00 am',
    day: 'today',
    href: '/parent/sessions',
    opens: 'Open sessions',
    urgent: false,
    push: true,
    read: false,
  },
  {
    id: 'seed-week',
    type: 'week',
    audience: 'parent',
    childId: 'alex',
    title: 'Alex’s week is ready',
    detail: '5 check-ins · mornings were hardest',
    when: '6:30 pm',
    day: 'yesterday',
    href: '/parent/insights',
    opens: 'Open insights',
    urgent: false,
    push: false,
    read: true,
  },
  {
    id: 'seed-journal',
    type: 'journal',
    audience: 'parent',
    childId: 'alex',
    title: 'Alex wrote in the journal',
    detail: 'What made you smile today?',
    when: 'Fri 9 Oct',
    day: 'earlier',
    href: '/parent/transcript?id=smile',
    opens: 'Open the journal entry',
    urgent: false,
    push: false,
    read: true,
  },
  {
    id: 'seed-notes',
    type: 'notes',
    audience: 'parent',
    childId: 'alex',
    title: 'Priya shared notes from the Tue 6 Oct session',
    detail: 'Practised feet on the floor',
    when: 'Tue 6 Oct',
    day: 'earlier',
    href: '/parent/session-notes',
    opens: 'Open session notes',
    urgent: false,
    push: true,
    read: true,
  },
  {
    id: 'seed-booking',
    type: 'booking',
    audience: 'parent',
    childId: 'alex',
    title: 'Session booked with Priya',
    detail: 'Tue 6 Oct · 4:00 pm · Video call',
    when: 'Thu 24 Sep',
    day: 'earlier',
    href: '/parent/sessions',
    opens: 'Open sessions',
    urgent: false,
    push: true,
    read: true,
  },
];

/** The therapist's seeded history (newest first). "Write notes" stays in Needs attention until the notes are shared. Badge: 1. */
export const SEED_THERAPIST_NOTIFICATIONS: Notification[] = [
  {
    id: 'seed-t-notes-due',
    type: 'notesDue',
    audience: 'therapist',
    childId: 'alex',
    title: 'Write notes for Alex',
    detail: 'Thu 8 Oct session · in person',
    when: 'Thu 8 Oct',
    day: 'earlier',
    href: '/therapist/notes?session=oct8',
    opens: 'Write session notes',
    urgent: false,
    push: false,
    read: false,
  },
  {
    id: 'seed-t-booking',
    type: 'booking',
    audience: 'therapist',
    childId: 'leo',
    title: 'New booking: Leo T.',
    detail: 'Thu 15 Oct · 3:00 pm · In person',
    when: 'Thu 8 Oct',
    day: 'earlier',
    href: '/therapist/session?id=leo-15',
    opens: 'Open the session',
    urgent: false,
    push: true,
    read: true,
  },
];

/** "3" … "9", then "9+". */
export const countLabel = (n: number) => (n > 9 ? '9+' : String(n));
