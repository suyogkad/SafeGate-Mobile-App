import { ALEX_LATER, OTHER_BOOKINGS, WEEKDAYS, type Availability, type Booking, type MeetKind, type Weekday } from '../data/practice';
import type { Session } from '../data/sessions';
import { THERAPISTS, type Therapist } from '../data/therapists';

/**
 * A therapist's calendar, worked out from their hours (Availability) and bookings. One source for the therapist's
 * Today, Calendar and My hours and for the family's Find a therapist / profile / Book (every directory therapist),
 * so a change on one side shows on the other at once. Dates are ISO strings ("2026-10-12"), times are minutes from midnight (960 = 4:00 pm).
 * TODO(safegate): the backend owns availability and bookings (and time zones); the app would only display them.
 */

/** Today, as YYYY-MM-DD in the device's own timezone (not UTC, or the date flips
 * late in the evening in Australia). Every "this week" calculation hangs off it. */
export function localDateIso(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Minutes since local midnight, to pair with localDateIso. */
export const localStartMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

export function todayIso(d = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Kept as a name because screens read it everywhere; it is simply today now. */
export const DEMO_TODAY = todayIso();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (iso: string, n: number) => {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};

/** Monday of the week the date is in. */
export const weekStart = (iso: string) => addDays(iso, -((toDate(iso).getDay() + 6) % 7));

export const weekdayOf = (iso: string): Weekday => WEEKDAYS[(toDate(iso).getDay() + 6) % 7].id;

/** "Monday 12 October" */
export const dayLabel = (iso: string) => {
  const d = toDate(iso);
  return `${WEEKDAYS[(d.getDay() + 6) % 7].label} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
/** "Mon 12 Oct" */
export const dayShort = (iso: string) => {
  const d = toDate(iso);
  return `${WEEKDAYS[(d.getDay() + 6) % 7].label.slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
};
/** "MON 12 OCT" (the parent's booking cards) */
export const dayCaps = (iso: string) => dayShort(iso).toUpperCase();
/** day number, "12" */
export const dayNumber = (iso: string) => String(toDate(iso).getDate());

/** 960 → "4:00 pm" */
export const timeLabel = (min: number) => {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
};
/** "4:00 pm" → 960 */
export const parseTime = (t: string) => {
  const [hm, ap] = t.split(' ');
  const [h, m] = hm.split(':').map(Number);
  return ((h % 12) + (ap === 'pm' ? 12 : 0)) * 60 + m;
};
/** "4:00 – 4:50 pm" (drops the first am/pm when both match) */
export const rangeLabel = (start: number, end: number) => {
  const a = timeLabel(start);
  const b = timeLabel(end);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
};

/** "THU 15 OCT" → "2026-10-15" (the parent's booked session carries the caps label). */
export const isoFromCaps = (short: string) => {
  const [, day, mon] = short.split(' ');
  const m = MONTHS.findIndex((x) => x.slice(0, 3).toUpperCase() === mon);
  return toIso(new Date(2026, m < 0 ? 9 : m, Number(day) || 15));
};

export const slotKey = (date: string, start: number) => `${date}@${start}`;

/** Which directory therapist the family's booked session is with ("Priya Shah" → "priya"). */
export const sessionTherapistId = (session: Session | null) => (session ? THERAPISTS.find((t) => t.name === session.therapist)?.id ?? 'priya' : 'priya');

/**
 * A therapist's bookings. Priya: her other clients + Alex's later session + Alex's next one when it's with her.
 * Sam and Mei: Alex's next one when it's with them (their other families' times are taken in their hours).
 */
export function bookingsFor(session: Session | null, lengthMin: number, therapistId: Therapist['id'] = 'priya'): Booking[] {
  const own = therapistId === 'priya' ? [...OTHER_BOOKINGS, ALEX_LATER] : [];
  if (!session) return own;
  const next: Booking = {
    id: 'alex-next',
    clientId: 'alex',
    date: isoFromCaps(session.short),
    start: parseTime(session.time),
    lengthMin,
    kind: session.kind,
  };
  const withAlex = sessionTherapistId(session) === therapistId ? [next] : [];
  return [...own, ...withAlex].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
}

export type Block =
  | { type: 'booked'; date: string; start: number; end: number; booking: Booking }
  | { type: 'open'; date: string; start: number; end: number; kind: MeetKind | null; extraId?: string }
  | { type: 'away'; date: string; label: string }
  | { type: 'off'; date: string };

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

/** One day on the calendar: booked sessions and open times in order, or the whole day away / off. */
export function blocksForDay(a: Availability, bookings: Booking[], date: string): Block[] {
  const away = a.timeOff.find((t) => date >= t.from && date <= t.to);
  if (away) return [{ type: 'away', date, label: away.label }];

  const booked = bookings.filter((b) => b.date === date).map((b) => ({ type: 'booked' as const, date, start: b.start, end: b.start + b.lengthMin, booking: b }));

  const open: Extract<Block, { type: 'open' }>[] = [];
  for (const r of a.weekly[weekdayOf(date)]) {
    for (let t = r.start; t + a.lengthMin <= r.end; t += a.lengthMin + a.gapMin) open.push({ type: 'open', date, start: t, end: t + a.lengthMin, kind: null });
  }
  for (const x of a.extra.filter((e) => e.date === date)) open.push({ type: 'open', date, start: x.start, end: x.start + x.lengthMin, kind: x.kind, extraId: x.id });

  const free = open
    .filter((o) => !a.removed.includes(slotKey(date, o.start)))
    .filter((o) => !booked.some((b) => overlaps(o.start, o.end, b.start, b.end)))
    // a video-only practice can't offer in-person times and the other way round
    .map((o) => (o.kind === 'Video call' && !a.video) || (o.kind === 'In person' && !a.inPerson) ? null : o)
    .filter((o): o is Extract<Block, { type: 'open' }> => !!o && (a.video || a.inPerson));

  const all: Block[] = [...booked, ...free].sort((x, y) => (x as { start: number }).start - (y as { start: number }).start);
  return all.length ? all : [{ type: 'off', date }];
}

/** The 7 days (Mon–Sun) of the week that starts on `monday`. */
export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

/** Open times families can book: after the notice period, inside the booking window. */
export function bookableSlots(a: Availability, bookings: Booking[], from: string, to: string) {
  const first = addDays(DEMO_TODAY, Math.max(1, a.noticeDays));
  const last = addDays(DEMO_TODAY, a.windowWeeks * 7);
  const out: Extract<Block, { type: 'open' }>[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (d < first || d > last) continue;
    for (const b of blocksForDay(a, bookings, d)) if (b.type === 'open') out.push(b);
  }
  return out;
}

/** The first time a family could book ("MON 12 OCT"), or null when nothing is open in the window. */
export function nextFree(a: Availability, bookings: Booking[]) {
  const first = bookableSlots(a, bookings, DEMO_TODAY, addDays(DEMO_TODAY, a.windowWeeks * 7))[0];
  return first ? dayCaps(first.date) : null;
}

/** Times a therapist can pick (never typed): every half hour from 7:00 am to 8:00 pm. */
export const PICKABLE_TIMES = Array.from({ length: 27 }, (_, i) => 420 + i * 30);
export const partOfDay = (min: number) => (min < 720 ? 'Morning' : min < 1020 ? 'Afternoon' : 'Evening');
