export type Session = {
  therapist: string;
  therapistFirst: string;
  role: string;
  dateLabel: string; // "Thursday 15 October"
  short: string; // "THU 15 OCT"
  time: string; // "4:00 pm"
  kind: 'Video call' | 'In person';
  place: string | null; // clinic + address when in person
  joinOpens: string; // "3:50 pm"
};

export const DEFAULT_SESSION: Session = {
  therapist: 'Priya Shah',
  therapistFirst: 'Priya',
  role: 'psychologist',
  dateLabel: 'Thursday 15 October',
  short: 'THU 15 OCT',
  time: '4:00 pm',
  kind: 'Video call',
  place: null,
  joinOpens: '3:50 pm',
};

/** Alex's later session: Thursday 29 October (Priya is away at a conference Mon 26 – Tue 27 Oct). */
export const LATER_SESSION = {
  dateLabel: 'Thursday, 29 October',
  time: '4:00 pm',
  kind: 'IN PERSON',
  with: 'With Priya Shah, psychologist',
  place: 'Parramatta clinic, 12 George Street',
};

/** Past sessions and their notes live with the therapist's data (src/data/practice.ts: ALEX_PAST, SEED_NOTES). */

export const BEFORE_SESSION = [
  { emoji: '🎧', text: 'Find a quiet spot' },
  { emoji: '💧', text: 'Get a drink of water' },
  { emoji: '📝', text: 'Think of one thing to talk about' },
];
