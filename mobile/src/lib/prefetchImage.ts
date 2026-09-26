import { Image } from 'react-native';

/** Phones: download into the native image cache. Resolves either way. (Web version: prefetchImage.web.ts.) */
export function prefetchImage(uri: string): Promise<void> {
  return Image.prefetch(uri).then(
    () => undefined,
    () => undefined,
  );
}
