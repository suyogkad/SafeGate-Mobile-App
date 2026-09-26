import type { ImageSourcePropType } from 'react-native';
import { FACES } from './faces';

export type MoodId = 'bad' | 'notGreat' | 'ok' | 'good' | 'great';

export type Mood = { id: MoodId; label: string; face: ImageSourcePropType; feelings: string[] };

/** Left to right. Colours live in theme `moodColors`; colour is never the only signal. */
export const MOODS: Mood[] = [
  { id: 'bad', label: 'Bad', face: FACES.sadDiamond, feelings: ['Scared', 'Angry', 'Worried', 'Sad', 'Too much', 'Hurt', 'Lonely', 'Stressed'] },
  { id: 'notGreat', label: 'Not great', face: FACES.frownHexagon, feelings: ['Worried', 'Sad', 'Tired', 'Grumpy', 'Left out', 'Nervous', 'Bored', 'Upset'] },
  { id: 'ok', label: 'Ok', face: FACES.flatStarburst, feelings: ['Calm', 'Fine', 'Quiet', 'Tired', 'Relaxed', 'Unsure', 'Bored', 'Sleepy'] },
  { id: 'good', label: 'Good', face: FACES.smileFlower, feelings: ['Happy', 'Proud', 'Calm', 'Hopeful', 'Friendly', 'Playful', 'Relaxed', 'Energetic'] },
  { id: 'great', label: 'Great', face: FACES.grinFlower, feelings: ['Excited', 'Proud', 'Loved', 'Brave', 'Silly', 'Grateful', 'Joyful', 'Strong'] },
];

export const DEFAULT_MOOD: MoodId = 'ok';

export const mood = (id: MoodId) => MOODS.find((m) => m.id === id)!;

export const TOPICS = [
  { id: 'school', emoji: '🏫', label: 'School' },
  { id: 'home', emoji: '🏠', label: 'Home' },
  { id: 'friends', emoji: '👫', label: 'Friends' },
  { id: 'sleep', emoji: '😴', label: 'Sleep' },
  { id: 'noise', emoji: '🔊', label: 'Noise' },
  { id: 'body', emoji: '🧍', label: 'My body' },
  { id: 'changed', emoji: '🔄', label: 'Something changed' },
  { id: 'unknown', emoji: '🤷', label: "I don't know" },
] as const;
