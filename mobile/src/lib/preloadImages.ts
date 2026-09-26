import { ART, FACES, PHOTOS } from '../data/faces';
import { imageUri } from './imageUri';
import { prefetchImage } from './prefetchImage';

/** Every bundled picture in the app. All of them live in src/data/faces.ts, so this covers every screen. */
const ALL = [...Object.values(FACES), ...Object.values(ART), ...Object.values(PHOTOS).flatMap((p) => [p.hero, p.face])];

let pending: Promise<void> | null = null;

/**
 * Loads every character and illustration once, at start-up, so no screen ever shows an image popping in.
 * On phones this fills the native image cache (in development, images otherwise come from the dev server one by one
 * as each screen opens); on web it fills React Native Web's image cache, so an <Image> draws its picture on its very
 * first frame. Never rejects: a failed image just loads the normal way later.
 */
export function preloadImages(): Promise<void> {
  if (!pending) {
    const uris = ALL.map((s) => imageUri(s)).filter((u): u is string => !!u);
    pending = Promise.all(uris.map(prefetchImage)).then(() => undefined);
  }
  return pending;
}

