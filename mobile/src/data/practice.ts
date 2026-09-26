import type { ImageSourcePropType } from 'react-native';
import { artTints } from '../theme/tokens';
import { FACES } from './faces';

/**
 * The therapist area's demo data (Priya's practice). Only Alex is live (shared store with the child and parent);
 * Mia and Leo are static so the client list reads like a real caseload.
 * Every side shares one demo day: Sunday 11 October (Priya doesn't work Sundays).
 * TODO(safegate): comes from the backend (the therapist's bookings and clients).
 */
export const PRACTITIONER = {
  name: 'Priya Shah',
  first: 'Priya',
  role: 'Psychologist',
  initials: 'PS',
  email: 'priya@example.com',
  password: 'password',
} as const;

export const DEMO_DAY = { label: 'Sunday 11 October', short: 'Sun 11 Oct' } as const;

export type ClientId = 'alex' | 'mia' | 'leo';

export type Client = {
  id: ClientId;
  /** Alex's name comes from the store (the parent can change it in setup) */
  name: string;
  age: string;
  parent: string;
  parentFirst: string;
  face: ImageSourcePropType;
  tint: string;
};

export const CLIENTS: Record<ClientId, Client> = {
  alex: { id: 'alex', name: 'Alex', age: '9 to 12', parent: 'Jordan Lee', parentFirst: 'Jordan', face: FACES.smileBlobCyan, tint: artTints.cyan },
  mia: { id: 'mia', name: 'Mia R.', age: '13 to 16', parent: 'Sam R.', parentFirst: 'Sam', face: FACES.coolArch, tint: artTints.lavender },
  leo: { id: 'leo', name: 'Leo T.', age: '5 to 8', parent: 'Ana T.', parentFirst: 'Ana', face: FACES.grinFlower, tint: artTints.yellow },
};

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: 'mon', label: 'Monday' },
  { id: 'tue', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' },
  { id: 'sun', label: 'Sunday' },
];

/** Minutes from midnight: 900 = 3:00 pm. */
export type TimeRange = { start: number; end: number };
export type MeetKind = 'Video call' | 'In person';

/** What the therapist sets in My hours (T03) and Add a time (T04). Families' Book reads open times from it. */
export type Availability = {
  /** an empty list = a day off */
  weekly: Record<Weekday, TimeRange[]>;
  lengthMin: 45 | 50 | 60;
  gapMin: 0 | 10 | 15;
  video: boolean;
  inPerson: boolean;
  /** how far ahead families can book */
  windowWeeks: number;
  /** how much notice (days) a booking needs */
  noticeDays: number;
  /** ISO dates, both ends included */
  timeOff: { id: string; from: string; to: string; label: string }[];
  /** one-off times outside the weekly hours; `kind` null = either way */
  extra: { id: string; date: string; start: number; lengthMin: number; kind: MeetKind | null }[];
  /** single open times taken away ("2026-10-12@960") */
  removed: string[];
};

export const SEED_AVAILABILITY: Availability = {
  weekly: {
    mon: [{ start: 900, end: 1080 }],
    tue: [{ start: 900, end: 1080 }],
    wed: [],
    thu: [{ start: 900, end: 1080 }],
    fri: [],
    sat: [],
    sun: [],
  },
  lengthMin: 50,
  gapMin: 10,
  video: true,
  inPerson: true,
  windowWeeks: 3,
  noticeDays: 1,
  timeOff: [{ id: 'conference', from: '2026-10-26', to: '2026-10-27', label: 'Conference' }],
  extra: [],
  removed: [],
};

/** A booked session on Priya's calendar. */
export type Booking = { id: string; clientId: ClientId; date: string; start: number; lengthMin: number; kind: MeetKind };

/**
 * Priya's other bookings (Alex's come from the shared store, so a parent's booking shows up live).
 * Mia and Leo come weekly.
 */
export const OTHER_BOOKINGS: Booking[] = [
  { id: 'mia-12', clientId: 'mia', date: '2026-10-12', start: 900, lengthMin: 50, kind: 'Video call' },
  { id: 'leo-15', clientId: 'leo', date: '2026-10-15', start: 900, lengthMin: 50, kind: 'In person' },
  { id: 'mia-19', clientId: 'mia', date: '2026-10-19', start: 900, lengthMin: 50, kind: 'Video call' },
  { id: 'leo-22', clientId: 'leo', date: '2026-10-22', start: 900, lengthMin: 50, kind: 'In person' },
  { id: 'leo-29', clientId: 'leo', date: '2026-10-29', start: 900, lengthMin: 50, kind: 'In person' },
];

/** Alex's later session (moved out of Priya's conference days). */
export const ALEX_LATER: Booking = { id: 'alex-later', clientId: 'alex', date: '2026-10-29', start: 960, lengthMin: 50, kind: 'In person' };

/** Alex's past sessions with Priya, newest first. Thu 8 Oct has no notes yet (demo step 12 writes them). */
export const ALEX_PAST: Booking[] = [
  { id: 'oct8', clientId: 'alex', date: '2026-10-08', start: 960, lengthMin: 50, kind: 'In person' },
  { id: 'oct6', clientId: 'alex', date: '2026-10-06', start: 960, lengthMin: 50, kind: 'Video call' },
  { id: 'sep24', clientId: 'alex', date: '2026-09-24', start: 660, lengthMin: 50, kind: 'Video call' },
];

/**
 * Session notes have two parts (rule 21): what's shared with the family (it becomes the parent's "Notes from Priya")
 * and the therapist's own working notes, which the family never sees.
 */
export type SessionNotes = {
  highlights: { emoji: string; text: string }[];
  /** "What I'd like Jordan to know" */
  shared: string;
  tryAtHome: { title: string; line: string }[];
  /** only the therapist sees these */
  working: string;
  /** "Tue 6 Oct" when shared with the family; null = a draft */
  sharedAt: string | null;
};

export const SEED_NOTES: Record<string, SessionNotes> = {
  oct6: {
    highlights: [
      { emoji: '🦶', text: 'Practised feet on the floor' },
      { emoji: '🏫', text: 'Talked about Monday mornings' },
      { emoji: '📝', text: 'Try the getting-ready steps at home' },
    ],
    shared:
      'Alex was chatty today and found the breathing steps easy. Mornings are still the hardest part of the week. Let’s keep the plan short and the same every day.',
    tryAtHome: [
      { title: 'Same order every morning', line: 'Use the steps in Alex’s day.' },
      { title: 'One calm step before school', line: 'Feet on the floor works well for Alex.' },
      { title: 'Notice the start', line: 'Getting going is the hard part.' },
    ],
    working: 'Settled quickly. Mornings: look at what changes on Mondays. Try a picture version of the steps next time.',
    sharedAt: 'Tue 6 Oct',
  },
  sep24: {
    highlights: [{ emoji: '🎯', text: 'Picked three goals together' }],
    shared: 'We got to know each other and chose three goals. Alex liked the grounding steps.',
    tryAtHome: [{ title: 'Feet on the floor', line: 'Once a day, when things feel calm.' }],
    working: 'First session. Goals agreed with Alex and Jordan.',
    sharedAt: 'Thu 24 Sep',
  },
};

/** Therapist-written goals (never scores). */
export const SEED_GOALS: Record<ClientId, string[]> = {
  alex: ['Mornings before school feel calmer', 'Use one calm step on a hard day', 'Tell someone when things are too loud'],
  mia: ['Feel ready for the school week', 'Plan a break during busy days'],
  leo: ['Say when something feels too much', 'Try new foods at a comfortable pace'],
};

/** What Mia's and Leo's families last shared (static: only Alex is live). */
export const OTHER_CLIENT_SHARING: Record<Exclude<ClientId, 'alex'>, { lastCheckin: string | null; sharedThisWeek: boolean; summary: string | null }> = {
  mia: { lastCheckin: null, sharedThisWeek: false, summary: null },
  leo: { lastCheckin: 'Good · Fri', sharedThisWeek: true, summary: '4 check-ins this week, mostly Good. Lunchtimes at school were the hardest.' },
};

/**
 * The other directory therapists' hours, so every therapist's open times (Find a therapist, profile, Book) are
 * worked out the same way as Priya's. They don't sign in to the demo, so their hours don't change; times other
 * families already booked are in `removed`.
 */
export const DIRECTORY_HOURS: Record<'sam' | 'mei', Availability> = {
  // Occupational therapist, video only: Wed and Fri mornings, 45 min + 15 min gap → 9:00, 10:00, 11:00
  sam: {
    weekly: { mon: [], tue: [], wed: [{ start: 540, end: 720 }], thu: [], fri: [{ start: 540, end: 720 }], sat: [], sun: [] },
    lengthMin: 45,
    gapMin: 15,
    video: true,
    inPerson: false,
    windowWeeks: 4,
    noticeDays: 1,
    timeOff: [],
    extra: [],
    removed: ['2026-10-14@540', '2026-10-16@600', '2026-10-21@660', '2026-10-23@540'],
  },
  // Speech pathologist, Chatswood: Mon 10 am – 1 pm and Thu 3:30 – 5:30 pm, 60 min back to back
  mei: {
    weekly: { mon: [{ start: 600, end: 780 }], tue: [], wed: [], thu: [{ start: 930, end: 1050 }], fri: [], sat: [], sun: [] },
    lengthMin: 60,
    gapMin: 0,
    video: true,
    inPerson: true,
    windowWeeks: 3,
    noticeDays: 1,
    timeOff: [{ id: 'mei-training', from: '2026-10-19', to: '2026-10-19', label: 'Training day' }],
    extra: [],
    removed: ['2026-10-12@600', '2026-10-15@930', '2026-10-22@990'],
  },
};
