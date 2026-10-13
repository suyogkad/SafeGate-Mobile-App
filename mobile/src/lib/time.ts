/** "3:42 pm" */
export function clockTime(d = new Date()): string {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

export function partOfDay(d = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = d.getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

export const greeting = (name: string, d = new Date()) => `Good ${partOfDay(d)}, ${name}`;

/** "Sunday 11 October" -- today, in the device's own locale. */
export function longDate(d = new Date()): string {
  const f = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  // en-AU gives "Wednesday, 7 October"; the design writes it without the comma.
  return f.format(d).replace(',', '');
}

const TITLES = new Set(['dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'mx', 'mx.', 'prof', 'prof.']);

/** First name for a greeting. Skips a title, so "Dr. Jamie Therapist" greets Jamie. */
export function firstName(full: string | null | undefined): string {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  const first = parts.find((w) => !TITLES.has(w.toLowerCase()));
  return first ?? parts[0] ?? '';
}

/** "PS" from "Priya Shah"; one letter when there is only one word. */
export function initialsOf(full: string | null | undefined): string {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean).filter((w) => !TITLES.has(w.toLowerCase()));
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * A timestamp as SafeGate writes times everywhere else: "4:00 pm", lower case.
 *
 * Intl's own formatter gives "4:00 PM" in some locales, which reads as shouting next
 * to the rest of the app. One helper so every screen agrees.
 */
export function clockOf(when: string | number | Date): string {
  const d = new Date(when);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}
