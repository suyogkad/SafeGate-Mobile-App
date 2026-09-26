import { ImageUriCache } from 'react-native-web/dist/modules/ImageLoader';

/** Loaded pictures are kept here so the browser keeps them in memory for the whole session. */
const kept: HTMLImageElement[] = [];

/**
 * Web: download the picture and mark it in React Native Web's image cache as soon as it arrives, so an <Image> with
 * this picture starts out "loaded" and draws it on its first frame. Unlike Image.prefetch this doesn't wait for
 * image.decode(), which browsers can hold back (e.g. in a background tab); decoding is still requested alongside.
 * Resolves either way.
 */
export function prefetchImage(uri: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      // add + remove: in the cache, with no active references (the same thing React Native Web's own prefetch does)
      ImageUriCache.add(uri);
      ImageUriCache.remove(uri);
      img.decode?.().catch(() => {});
      resolve();
    };
    img.onerror = () => resolve();
    img.src = uri;
    kept.push(img);
  });
}
