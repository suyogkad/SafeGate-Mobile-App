import type { FaceName } from './faces';

// TODO(safegate): placeholder wording — needs a clinician's review before real use.

export type CalmFilter = 'Slow down' | 'In my body' | 'Busy head' | 'Too loud';
export const CALM_FILTERS: CalmFilter[] = ['Slow down', 'In my body', 'Busy head', 'Too loud'];

export type CalmActivity = {
  id: 'feet' | 'breathing' | 'squeeze';
  title: string;
  description: string;
  filters: CalmFilter[];
  goodFor: { emoji: string; text: string }[];
  youllDo: { icon: string; title: string; line: string }[];
  steps: string[];
  /** Character + tint for the activity's band */
  art: { face: FaceName; tint: 'cyan' | 'lavender' | 'blue' | 'green' | 'yellow' };
};

const READ_TO_ME = { icon: 'volume-2', title: 'Read to me', line: 'Hear each step out loud' };

export const CALM_ACTIVITIES: CalmActivity[] = [
  {
    id: 'feet',
    title: 'Feet on the floor',
    description: 'Feel the ground under you and let your shoulders drop.',
    filters: ['Slow down', 'In my body', 'Too loud'],
    goodFor: [
      { emoji: '🔊', text: 'Everything feels too loud' },
      { emoji: '🌀', text: 'My thoughts are going fast' },
      { emoji: '🦵', text: 'My body feels wiggly' },
    ],
    youllDo: [
      { icon: 'arrow-down', title: 'Feel your feet', line: 'Press them into the floor' },
      { icon: 'chevrons-down', title: 'Drop shoulders', line: 'Let them go down' },
      { icon: 'wind', title: 'Breathe slowly', line: 'Make it long' },
      READ_TO_ME,
    ],
    art: { face: 'calmHexagon', tint: 'cyan' },
    steps: [
      'Sit or stand. Put both feet flat on the floor.',
      'Feel the ground under them. Press down a little.',
      'Let your shoulders drop down, away from your ears.',
      'Breathe out slowly, like blowing out a candle.',
      'Look around and find one thing you like the colour of.',
    ],
  },
  {
    id: 'breathing',
    title: 'Slow breathing',
    description: 'Breathe out a little longer than you breathe in.',
    filters: ['Slow down', 'Busy head'],
    goodFor: [
      { emoji: '🌀', text: 'My thoughts are going fast' },
      { emoji: '💓', text: 'My heart is beating fast' },
      { emoji: '😣', text: 'I feel wound up' },
    ],
    youllDo: [
      { icon: 'wind', title: 'Breathe in', line: 'Slowly through your nose' },
      { icon: 'feather', title: 'Breathe out', line: 'A little longer' },
      { icon: 'pause', title: 'Stay still', line: 'Let your body rest' },
      READ_TO_ME,
    ],
    art: { face: 'smileFlower', tint: 'lavender' },
    steps: [
      'Put one hand on your tummy.',
      'Breathe in slowly through your nose.',
      'Breathe out slowly, a little longer than you breathed in.',
      'Do it two more times. Feel your tummy go up and down.',
    ],
  },
  {
    id: 'squeeze',
    title: 'Squeeze and let go',
    description: 'Squeeze your hands tight, then let them go soft.',
    filters: ['Slow down', 'In my body', 'Busy head'],
    goodFor: [
      { emoji: '😠', text: 'I feel angry or tight' },
      { emoji: '🦵', text: 'My body feels wiggly' },
      { emoji: '🌀', text: 'My thoughts are going fast' },
    ],
    youllDo: [
      { icon: 'minimize-2', title: 'Squeeze', line: 'Hands tight for 3' },
      { icon: 'maximize-2', title: 'Let go', line: 'Let them go soft' },
      { icon: 'wind', title: 'Breathe', line: 'Slow and easy' },
      READ_TO_ME,
    ],
    art: { face: 'smileBlobCyan', tint: 'green' },
    steps: [
      'Make two tight fists with your hands.',
      'Squeeze and count to three.',
      'Let your hands go soft and floppy.',
      'Now squeeze your shoulders up to your ears.',
      'Let them drop down and go soft.',
      'Take one slow breath out.',
    ],
  },
];

export const calmActivity = (id: string) => CALM_ACTIVITIES.find((a) => a.id === id) ?? CALM_ACTIVITIES[0];

/** Calm mode always uses Feet on the floor. */
export const CALM_MODE_ACTIVITY = CALM_ACTIVITIES[0];
