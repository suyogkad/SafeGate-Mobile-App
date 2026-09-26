/** P02–P06 About your child — one question per screen (HANDOFF.md §12). Answers go to `child` in the store. */

export const AGE_BANDS = ['5 to 8', '9 to 12', '13 to 16'] as const;

export const FEELING_LATELY = [
  { emoji: '🌿', label: 'Mostly calm' },
  { emoji: '🌤️', label: 'Sometimes stressed or wound up' },
  { emoji: '🌧️', label: 'Often worried or upset' },
  { emoji: '🌪️', label: 'Big feelings are hard to handle' },
  { emoji: '❓', label: "I'm not sure how to describe it" },
];

export const HARD_THINGS = [
  { emoji: '🔊', label: 'Loud or busy places' },
  { emoji: '🔄', label: 'Changes to routine' },
  { emoji: '🏫', label: 'School and homework' },
  { emoji: '👫', label: 'Friendships' },
  { emoji: '😴', label: 'Sleep' },
  { emoji: '🌋', label: 'Big feelings' },
  { emoji: '🧩', label: 'Getting started on tasks' },
  { emoji: '💬', label: 'Talking to people' },
];

export const HELP_MOST = [
  { emoji: '🧘', label: 'Calming down when upset' },
  { emoji: '🪜', label: 'Breaking tasks into small steps' },
  { emoji: '💬', label: 'Someone to talk to between sessions' },
  { emoji: '📅', label: 'Getting ready for sessions' },
  { emoji: '🤝', label: 'Feeling less alone' },
];

export const COMMUNICATE = ['Talking out loud', 'Typing', 'Short, simple sentences', 'Pictures next to words', 'Having things read aloud'];
