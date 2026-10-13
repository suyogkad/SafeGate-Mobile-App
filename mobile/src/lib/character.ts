/**
 * A stable character picture for any id, real or demo.
 *
 * SafeGate shows no photographs of people. Everyone gets a character instead, and
 * the same id always gets the same one, so a child or a therapist is recognisable
 * from screen to screen and across reloads.
 */
import type { ImageSourcePropType } from 'react-native';
import { FACES } from '../data/faces';
import { artTints } from '../theme/tokens';

export type Character = { face: ImageSourcePropType; tint: string };

const CHARACTERS: Character[] = [
  { face: FACES.smileBlobCyan, tint: artTints.cyan },
  { face: FACES.coolArch, tint: artTints.lavender },
  { face: FACES.grinFlower, tint: artTints.yellow },
  { face: FACES.smileFlower, tint: artTints.green },
  { face: FACES.monocleWave, tint: artTints.blue },
];

export function characterFor(id: string): Character {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CHARACTERS[hash % CHARACTERS.length];
}
