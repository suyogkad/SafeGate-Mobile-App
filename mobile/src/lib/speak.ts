import * as Speech from 'expo-speech';
import { useApp } from '../store/app';

const RATES = { Slower: 0.8, Normal: 1, Faster: 1.15 } as const;

/** "Read to me": text-to-speech the child starts by tapping. Never automatic. */
export function readAloud(text: string) {
  const { readingSpeed } = useApp.getState().comfort;
  Speech.stop();
  Speech.speak(text, { language: 'en-AU', rate: RATES[readingSpeed] });
}

export function stopReading() {
  Speech.stop();
}
