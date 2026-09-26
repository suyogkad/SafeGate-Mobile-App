export type Line = { from: 'companion' | 'me'; text: string; card?: boolean };

export type Transcript = {
  id: 'homework' | 'calm' | 'smile' | 'calm-place' | 'school';
  kind: 'talk' | 'calm' | 'journal';
  day: string;
  time: string;
  opener: string;
  lines: Line[];
  /** calm transcripts: a divider after the lines; nothing from the AI after it */
  calmDivider?: string;
};

export const TRANSCRIPTS: Transcript[] = [
  {
    id: 'homework',
    kind: 'talk',
    day: 'Friday, 9 October',
    time: '4:10 pm',
    opener: 'What would you like to talk about?',
    lines: [
      { from: 'companion', text: 'Hi Alex. What would you like to talk about?' },
      { from: 'me', text: "I have homework and I don't know where to start." },
      { from: 'companion', text: 'That happens to lots of people. What subject is it?' },
      { from: 'me', text: "Maths. It's a sheet with twenty questions." },
      {
        from: 'companion',
        card: true,
        text: "Let's break it down into tiny steps: 1. Just get the worksheet and a pencil on the table. 2. Pick the three easiest questions to do first. 3. Take a 5-minute break whenever you finish those.",
      },
    ],
  },
  {
    id: 'calm',
    kind: 'calm',
    day: 'Friday, 9 October',
    time: '3:42 pm',
    opener: 'The app switched to calm steps.',
    lines: [
      { from: 'companion', text: 'How did everything go with your project?' },
      { from: 'me', text: "I can't do this anymore. Everything is too much and I want it all to stop." },
    ],
    calmDivider: '3:42 pm',
  },
  {
    id: 'smile',
    kind: 'journal',
    day: 'Friday, 9 October',
    time: '7:30 pm',
    opener: 'What made you smile today?',
    lines: [
      { from: 'companion', text: 'What made you smile today?' },
      { from: 'me', text: 'We played tag at lunch and I was the fastest.' },
      { from: 'companion', card: true, text: 'That sounds fun. Who were you playing with?' },
    ],
  },
  {
    id: 'calm-place',
    kind: 'journal',
    day: 'Thursday, 8 October',
    time: '6:45 pm',
    opener: 'What makes you feel calm?',
    lines: [
      { from: 'companion', text: 'What makes you feel calm?' },
      { from: 'me', text: 'My room with the blue lamp on and my headphones.' },
      { from: 'companion', card: true, text: 'That sounds like a cosy place. What do you like to listen to there?' },
    ],
  },
  {
    id: 'school',
    kind: 'talk',
    day: 'Thursday, 8 October',
    time: '5:15 pm',
    opener: 'How was school today?',
    lines: [
      { from: 'companion', text: 'How was school today?' },
      { from: 'me', text: 'Math was okay, but the classroom was really loud.' },
      { from: 'companion', card: true, text: 'Loud rooms can be hard. Would it help to plan a quiet break for tomorrow?' },
    ],
  },
];

export const transcript = (id: string) => TRANSCRIPTS.find((t) => t.id === id);

export const KIND_TAG: Record<Transcript['kind'], string> = { talk: 'TALK', calm: 'CALM STEPS', journal: 'JOURNAL' };

/** Character + tint per kind (parent list and transcript header). */
export const KIND_ART: Record<Transcript['kind'], { face: 'monocleWave' | 'calmHexagon' | 'smilePillPink'; tint: 'blue' | 'cyan' | 'yellow' }> = {
  talk: { face: 'monocleWave', tint: 'blue' },
  calm: { face: 'calmHexagon', tint: 'cyan' },
  journal: { face: 'smilePillPink', tint: 'yellow' },
};
