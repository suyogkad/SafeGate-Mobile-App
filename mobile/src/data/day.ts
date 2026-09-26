import type { FaceName } from './faces';
import type { artTints } from '../theme/tokens';

/** Alex's day (parent, P23) → which rows show on the child's Home (C06). */

export type HomeRowId = 'checkin' | 'chat' | 'calm' | 'journal' | 'tasks';

export type DayItemId = 'feel' | 'breathing' | 'calm' | 'chat' | 'journal' | 'sounds' | 'kind' | 'tasks';

export const DAY_ITEMS: { id: DayItemId; label: string; row: HomeRowId | null; defaultOn: boolean }[] = [
  { id: 'feel', label: 'How do I feel?', row: 'checkin', defaultOn: true },
  { id: 'breathing', label: 'Breathing', row: null, defaultOn: true },
  { id: 'calm', label: 'Calm steps', row: 'calm', defaultOn: true },
  { id: 'chat', label: 'Chat with AI', row: 'chat', defaultOn: true },
  { id: 'journal', label: 'Journal', row: 'journal', defaultOn: false },
  { id: 'sounds', label: 'Sounds', row: null, defaultOn: false },
  { id: 'kind', label: 'Kind words', row: null, defaultOn: false },
  { id: 'tasks', label: 'My tasks', row: 'tasks', defaultOn: false },
];

export const DAY_PLANS = [
  { title: 'Calm mornings', text: 'A check-in, one calm step and a chat before school.' },
  { title: 'After school', text: 'A check-in and a chat when Alex gets home.' },
  { title: 'Wind down', text: 'One calm step and a few quiet minutes before bed.' },
];
export const DAY_FOCUS = ['Calming down', 'Getting ready', 'Talking about feelings'];
export const DAY_COUNTS = [2, 3, 4];

export type DaySettings = { plan: number; focus: number; count: number; on: Record<DayItemId, boolean> };

export const DEFAULT_DAY: DaySettings = {
  plan: 0,
  focus: 0,
  count: 3,
  on: Object.fromEntries(DAY_ITEMS.map((i) => [i.id, i.defaultOn])) as Record<DayItemId, boolean>,
};

/** Each Home row gets a character in a tinted circle (like the check-in cards). */
export const HOME_ROWS: Record<HomeRowId, { title: string; tag: string; href: string; face: FaceName; tint: keyof typeof artTints }> = {
  checkin: { title: 'see how you’re feeling', tag: 'CHECK IN', href: '/feel', face: 'smileFlower', tint: 'lavender' },
  chat: { title: 'say anything you like', tag: 'CHAT', href: '/talk', face: 'monocleWave', tint: 'blue' },
  calm: { title: 'try one calm-down step', tag: 'CALM', href: '/calm', face: 'calmHexagon', tint: 'cyan' },
  journal: { title: 'write or draw a little', tag: 'JOURNAL', href: '/journal', face: 'smilePillPink', tint: 'yellow' },
  tasks: { title: 'one small task, step by step', tag: 'TASK', href: '/my-task', face: 'crownEgg', tint: 'green' },
};

/** Items that are on AND have a Home row, in order, capped at count. Session row is always shown first, separately. */
export function homeRows(day: DaySettings): HomeRowId[] {
  return DAY_ITEMS.filter((i) => day.on[i.id] && i.row)
    .map((i) => i.row as HomeRowId)
    .slice(0, day.count);
}
