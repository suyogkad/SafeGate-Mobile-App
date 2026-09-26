import type { MoodId } from './moods';

/** What a parent sees after tapping a point on the mood chart (Alex's own words and check-ins; never scores). */
export type MoodDetail = {
  /** e.g. "Wednesday 7 October" or "Week 3 · 28 Sep – 4 Oct" */
  title: string;
  /** e.g. "Checked in at 8:20 am" or "4 check-ins" */
  when: string;
  feelings?: string[];
  topics?: string[];
  note?: string;
};

export type MoodPoint = { day: string; mood: MoodId; label?: boolean; detail?: MoodDetail };

// The demo week is Mon 5 – Sun 11 Oct 2026 (the demo's "today" is Sun 11 Oct). Five check-ins; on Tuesday and
// Sunday the mood comes from what Alex said in a chat.
export const WEEK: MoodPoint[] = [
  { day: 'MON', mood: 'ok', detail: { title: 'Monday 5 October', when: 'Checked in at 7:50 am', feelings: ['Tired', 'Calm'], topics: ['School'], note: 'Used the breathing steps before school.' } },
  { day: 'TUE', mood: 'notGreat', detail: { title: 'Tuesday 6 October', when: 'No check-in. From a chat after school', topics: ['Noise'], note: 'Said the bus was really loud today.' } },
  { day: 'WED', mood: 'bad', label: true, detail: { title: 'Wednesday 7 October', when: 'Checked in at 8:20 am', feelings: ['Worried', 'Too much'], topics: ['Something changed', 'School'], note: 'The timetable changed at school. Did Feet on the floor at lunch.' } },
  { day: 'THU', mood: 'ok', label: true, detail: { title: 'Thursday 8 October', when: 'Checked in at 7:58 am', feelings: ['Fine', 'Tired'], topics: ['School', 'Noise'], note: 'Chatted after school about a loud classroom.' } },
  { day: 'FRI', mood: 'good', detail: { title: 'Friday 9 October', when: 'Checked in at 8:10 am', feelings: ['Happy', 'Proud'], topics: ['Friends'], note: 'Wrote about playing tag at lunch. Later the app switched to calm steps at 3:42 pm (see Chats).' } },
  { day: 'SAT', mood: 'great', label: true, detail: { title: 'Saturday 10 October', when: 'Checked in at 10:15 am', feelings: ['Excited', 'Happy'], topics: ['Home'], note: 'Soccer in the morning, then drawing.' } },
  { day: 'SUN', mood: 'good', detail: { title: 'Sunday 11 October', when: 'No check-in yet. From a chat this morning', topics: ['Home'], note: 'A quiet morning with the dog.' } },
];

export const MONTH: MoodPoint[] = [
  { day: 'WEEK 1', mood: 'notGreat', detail: { title: 'Week 1 · 14 – 20 Sep', when: '3 check-ins', topics: ['School', 'Sleep'], note: 'Monday and Tuesday mornings were the hardest.' } },
  { day: 'WEEK 2', mood: 'ok', label: true, detail: { title: 'Week 2 · 21 – 27 Sep', when: '4 check-ins', topics: ['School', 'Friends'], note: 'First session with Priya on Thursday.' } },
  { day: 'WEEK 3', mood: 'bad', label: true, detail: { title: 'Week 3 · 28 Sep – 4 Oct', when: '3 check-ins', topics: ['Something changed', 'Noise'], note: 'Routine changed most days. Big feelings after school.' } },
  { day: 'WEEK 4', mood: 'good', label: true, detail: { title: 'Week 4 · 5 – 11 Oct', when: '5 check-ins', topics: ['Friends', 'Home'], note: 'Breathing steps helped twice. Weekend was the best part.' } },
];

export const TODAY_CHECKIN = { mood: 'ok' as MoodId, time: '8:10 am', feelings: ['Calm', 'Tired'], topics: ['School'] };

export const SHARED =
  'Alex checked in five times this week. Mornings before school were the hardest. Alex used the breathing steps twice and said they helped.';
export const SHARED_LONG =
  'Alex checked in five times this week. Mornings before school were the hardest, especially on days with schedule changes. Drawing and quiet time with the dog helped Alex reset in the afternoon.';

export const GOOD_DAYS = { good: 4, other: 3, vsLastWeek: '+1 day', fill: 0.62 };

export const HAPPY = [
  { emoji: '🐶', text: 'The dog' },
  { emoji: '🎨', text: 'Drawing' },
  { emoji: '⚽', text: 'Soccer' },
  { emoji: '🎮', text: 'Games' },
];
export const HARD = [
  { emoji: '🔊', text: 'Noise' },
  { emoji: '⏰', text: 'Rushed mornings' },
  { emoji: '🔄', text: 'Changes' },
];

export const HELPS = { title: 'Breathing steps', caption: 'How Alex checked in afterwards', value: 'Ok or better', fill: 0.7 };

export const DISCLAIMER =
  "This summary is based on what Alex chose to share. It isn't medical advice. Talk to Priya about anything that worries you.";

export const TODAY_WITH_ALEX = [
  { title: 'checked in: Ok', tag: 'CHECK IN', time: '8:10 am' },
  { title: 'chatted with the AI companion', tag: 'CHAT', time: '7:42 am' },
  { title: 'wrote in the journal', tag: 'JOURNAL', time: 'yesterday' },
];
