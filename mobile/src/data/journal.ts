import type { FaceName } from './faces';

// TODO(safegate): placeholder wording — needs a clinician's review before real use.

export const TODAYS_IDEAS = [
  'What made you smile today?',
  'What is one thing you want to remember about today?',
  'What was the best part of your day?',
  'Who was kind to you today?',
];

export const COMPANION_REPLY = 'Thank you for writing that. Would you like to add anything else?';
export const SMILE_REPLY = 'That sounds fun. Who were you playing with?';

export type JournalTopic = {
  id: string;
  title: string;
  prompts: { text: string; tag: string }[];
  /** Character + tint for the topic tile and header band */
  art: { face: FaceName; tint: 'cyan' | 'lavender' | 'blue' | 'green' | 'yellow' };
};

export const JOURNAL_TOPICS: JournalTopic[] = [
  {
    id: 'about-me',
    art: { face: 'crownEgg', tint: 'yellow' },
    title: 'About me',
    prompts: [
      { text: 'What are three things you are good at?', tag: 'Strengths' },
      { text: 'What is your favourite thing to do?', tag: 'Fun' },
      { text: 'What makes you feel calm?', tag: 'Calm' },
      { text: 'What is something new you learned?', tag: 'Learning' },
      { text: 'What would you like people to know about you?', tag: 'Me' },
      { text: 'What is your favourite place?', tag: 'Places' },
      { text: 'What makes you laugh?', tag: 'Fun' },
    ],
  },
  {
    id: 'happy-things',
    art: { face: 'grinFlower', tint: 'green' },
    title: 'Happy things',
    prompts: [
      { text: 'What made you smile today?', tag: 'Smile' },
      { text: 'What is your favourite food?', tag: 'Food' },
      { text: 'What is a song you love?', tag: 'Music' },
      { text: 'What animal makes you happy?', tag: 'Animals' },
      { text: 'What was the best part of your week?', tag: 'Week' },
      { text: 'What is something you are looking forward to?', tag: 'Soon' },
      { text: 'What is a game you love to play?', tag: 'Fun' },
    ],
  },
  {
    id: 'big-feelings',
    art: { face: 'oMouthPink', tint: 'lavender' },
    title: 'Big feelings',
    prompts: [
      { text: 'When did you feel brave today?', tag: 'Brave' },
      { text: 'What does worry feel like in your body?', tag: 'Worry' },
      { text: 'What helps when you feel angry?', tag: 'Angry' },
      { text: 'What do you do when you feel sad?', tag: 'Sad' },
      { text: 'Who can you talk to when things are hard?', tag: 'People' },
      { text: 'What is one thing you are proud of?', tag: 'Proud' },
    ],
  },
  {
    id: 'friends-family',
    art: { face: 'smileGhost', tint: 'blue' },
    title: 'Friends and family',
    prompts: [
      { text: 'Who made you feel good today?', tag: 'People' },
      { text: 'What do you like doing with your family?', tag: 'Family' },
      { text: 'What makes a good friend?', tag: 'Friends' },
      { text: 'Who would you like to spend more time with?', tag: 'People' },
      { text: 'What is something kind you did for someone?', tag: 'Kind' },
      { text: 'Who can you ask for help?', tag: 'Help' },
      { text: 'What is a fun memory with a friend?', tag: 'Memory' },
    ],
  },
  {
    id: 'school',
    art: { face: 'glassesSquare', tint: 'yellow' },
    title: 'School',
    prompts: [
      { text: 'What was the easiest part of school today?', tag: 'Easy' },
      { text: 'What was the hardest part of school today?', tag: 'Hard' },
      { text: 'Who did you sit with at lunch?', tag: 'Friends' },
      { text: 'What is your favourite subject?', tag: 'Learning' },
      { text: 'What helps you in a noisy classroom?', tag: 'Noise' },
      { text: 'What would make tomorrow easier?', tag: 'Plan' },
      { text: 'What did you learn today?', tag: 'Learning' },
    ],
  },
  {
    id: 'dreams',
    art: { face: 'calmHexagon', tint: 'cyan' },
    title: 'Dreams',
    prompts: [
      { text: 'What would you like to be when you grow up?', tag: 'Future' },
      { text: 'Where would you like to visit one day?', tag: 'Places' },
      { text: 'What is a dream you remember?', tag: 'Sleep' },
      { text: 'What would your perfect day look like?', tag: 'Perfect' },
      { text: 'What would you invent?', tag: 'Ideas' },
      { text: 'What is something you want to learn?', tag: 'Learning' },
      { text: 'What superpower would you like?', tag: 'Fun' },
    ],
  },
];

export const journalTopic = (id: string) => JOURNAL_TOPICS.find((t) => t.id === id) ?? JOURNAL_TOPICS[0];

/** Sentence starters behind the Ideas button on the writing screen. */
export const WRITING_STARTERS = ['Today I…', 'It made me feel…', 'I liked it when…', 'Next time I want to…'];

/** P21 Alex's journal — demo totals for the parent's summary (optional richer version in the spec). */
export const JOURNAL_STATS = { entries: 12, words: 540, afterWriting: '5 of 7', feelingMost: 'Worried' };
