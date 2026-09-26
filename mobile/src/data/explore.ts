import type { FaceName } from './faces';

/** C07 Explore — everything on the page, with keywords for the "Search by feeling or thing" field. */

export type ExploreItem = {
  id: string;
  label: string;
  /** CALM / CHAT / JOURNAL tag for "Based on how you feel" rows */
  tag?: string;
  href: string;
  keywords: string;
  face?: FaceName;
  icon?: string;
  tint: 'cyan' | 'lavender' | 'blue' | 'green' | 'yellow' | 'amber';
};

export const QUICK_SEARCHES = ['School', 'Home', 'Friends', 'Bedtime', 'Too loud', 'Busy head'];

export const EXPLORE_SECTIONS: { title: string; kind: 'rows' | 'tiles'; items: ExploreItem[] }[] = [
  {
    title: 'Based on how you feel',
    kind: 'rows',
    items: [
      { id: 'slow-breathing', label: 'try slow breathing', tag: 'CALM', href: '/calm-activity?id=breathing', keywords: 'breathing calm slow busy head worried angry bedtime', face: 'smileFlower', tint: 'lavender' },
      { id: 'chat-day', label: 'chat about your day', tag: 'CHAT', href: '/talk', keywords: 'chat talk day school home friends', face: 'monocleWave', tint: 'blue' },
      { id: 'good-thing', label: 'write one good thing', tag: 'JOURNAL', href: '/journal', keywords: 'write journal good happy', face: 'smilePillPink', tint: 'yellow' },
    ],
  },
  {
    title: 'Ask your AI companion',
    kind: 'tiles',
    items: [
      { id: 'steps', label: 'Break it into steps', href: '/talk?prompt=Break%20it%20into%20steps', keywords: 'homework school task steps busy head', icon: 'list', tint: 'blue' },
      { id: 'simply', label: 'Explain it simply', href: '/talk?prompt=Explain%20it%20simply', keywords: 'school homework explain', icon: 'help-circle', tint: 'blue' },
      { id: 'joke', label: 'Tell me a joke', href: '/talk?prompt=Tell%20me%20a%20joke', keywords: 'joke fun laugh friends', icon: 'smile', tint: 'blue' },
      { id: 'plan', label: 'Plan my day', href: '/my-task', keywords: 'plan day morning bedtime routine school', icon: 'calendar', tint: 'blue' },
      { id: 'read', label: 'Read it to me', href: '/talk?prompt=Read%20it%20to%20me', keywords: 'read listen school', icon: 'volume-2', tint: 'blue' },
      { id: 'just-chat', label: 'Just chat', href: '/talk', keywords: 'chat talk friends home lonely', icon: 'message-circle', tint: 'blue' },
    ],
  },
  {
    title: 'Calm your body',
    kind: 'tiles',
    items: [
      { id: 'breathing', label: 'Breathing', href: '/calm-activity?id=breathing', keywords: 'breathing calm busy head worried angry bedtime', face: 'smileFlower', tint: 'lavender' },
      { id: 'feet', label: 'Feet on the floor', href: '/calm-activity?id=feet', keywords: 'feet body wiggly too loud noise calm', face: 'calmHexagon', tint: 'cyan' },
      { id: 'sounds', label: 'Sounds', href: '/calm?filter=Too%20loud', keywords: 'sounds too loud noise bedtime quiet', face: 'coolArch', tint: 'blue' },
    ],
  },
  {
    title: 'Write and check in',
    kind: 'tiles',
    items: [
      { id: 'journal', label: 'Journal', href: '/journal', keywords: 'write journal draw', face: 'smilePillPink', tint: 'yellow' },
      { id: 'feel', label: 'How do I feel?', href: '/feel', keywords: 'feel check in mood sad worried happy', face: 'flatStarburst', tint: 'blue' },
      { id: 'kind', label: 'Kind words', href: '/journal-write?prompt=Write%20something%20kind%20about%20yourself.', keywords: 'kind friends home happy', face: 'smileGhost', tint: 'green' },
    ],
  },
];

/** Matches the label or any keyword, case-insensitive. */
export const matchesSearch = (item: ExploreItem, q: string) => {
  const t = q.trim().toLowerCase();
  return !t || item.label.toLowerCase().includes(t) || item.keywords.includes(t);
};
