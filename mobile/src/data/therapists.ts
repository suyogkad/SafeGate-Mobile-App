import type { FaceName } from './faces';

export type Therapist = {
  id: 'priya' | 'sam' | 'mei';
  name: string;
  first: string;
  initials: string;
  role: 'Psychologist' | 'Occupational therapist' | 'Speech pathologist';
  blurb: string;
  about: string;
  years: string;
  tagline: string;
  goodFor: { emoji: string; text: string }[];
  /** null = video only */
  clinic: { name: string; address: string } | null;
  /** Character + tint used beside the initials (no photos of people) */
  art: { face: FaceName; tint: 'cyan' | 'lavender' | 'blue' | 'green' | 'yellow' };
};

export const THERAPISTS: Therapist[] = [
  {
    id: 'priya',
    art: { face: 'smileFlower', tint: 'lavender' },
    name: 'Priya Shah',
    first: 'Priya',
    initials: 'PS',
    role: 'Psychologist',
    blurb: 'Psychologist · Autistic kids and teens · Video or Parramatta',
    about: 'Psychologist in Parramatta. Works with kids aged 6 to 16.',
    years: '9 YEARS WITH KIDS',
    tagline: 'Calm, practical sessions for autistic and ADHD kids and their families.',
    goodFor: [
      { emoji: '🧩', text: 'Autism and ADHD' },
      { emoji: '🌋', text: 'Big feelings and meltdowns' },
      { emoji: '🏫', text: 'School worries' },
    ],
    clinic: { name: 'Parramatta', address: '12 George Street' },
  },
  {
    id: 'sam',
    art: { face: 'smileBlobCyan', tint: 'cyan' },
    name: 'Sam Okafor',
    first: 'Sam',
    initials: 'SO',
    role: 'Occupational therapist',
    blurb: 'Occupational therapist · Sensory needs and routines · Video',
    about: 'Occupational therapist. Works with kids aged 4 to 14.',
    years: '6 YEARS WITH KIDS',
    tagline: 'Gentle help with sensory needs, routines and everyday tasks.',
    goodFor: [
      { emoji: '🎧', text: 'Sensory needs' },
      { emoji: '🗓️', text: 'Routines and changes' },
      { emoji: '✋', text: 'Everyday skills' },
    ],
    clinic: null,
  },
  {
    id: 'mei',
    art: { face: 'smilePillPink', tint: 'yellow' },
    name: 'Mei Tanaka',
    first: 'Mei',
    initials: 'MT',
    role: 'Speech pathologist',
    blurb: 'Speech pathologist · Talking and understanding · Video or Chatswood',
    about: 'Speech pathologist in Chatswood. Works with kids aged 3 to 12.',
    years: '11 YEARS WITH KIDS',
    tagline: 'Playful sessions for talking, listening and being understood.',
    goodFor: [
      { emoji: '💬', text: 'Talking and understanding' },
      { emoji: '🤝', text: 'Making friends' },
      { emoji: '🖼️', text: 'Picture and device talk' },
    ],
    clinic: { name: 'Chatswood', address: '5 Help Street' },
  },
];

export const therapist = (id: string) => THERAPISTS.find((t) => t.id === id) ?? THERAPISTS[0];

export const THERAPIST_FILTERS = ['All', 'Psychologist', 'Occupational therapist', 'Speech pathologist', 'Counsellor'] as const;

export const WAYS_TO_MEET = {
  video: { title: 'Video call', line: 'From home, on any device' },
  inPerson: (t: Therapist) => ({ title: 'In person', line: t.clinic ? `${t.clinic.name} clinic` : 'Video only for now' }),
  parentCheckIn: { title: 'Parent check-in', line: '10 mins with you after each session' },
  notes: { title: 'Notes after sessions', line: 'Shared with you in SafeGate' },
};

/** A bookable time. `kind` set = the therapist offers it only that way. */
export type Slot = { day: string; dateLabel: string; short: string; time: string; joinOpens: string; kind?: 'Video call' | 'In person' | null };
