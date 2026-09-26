import { PixelRatio, type ImageSourcePropType } from 'react-native';
import { getAssetByID } from 'react-native-web/dist/modules/AssetRegistry';

/**
 * The exact URI React Native Web's <Image> uses for a bundled image (same rules as its resolveAssetUri), so an
 * image prefetched with it counts as already loaded and shows on the very first frame.
 */
export function imageUri(source: ImageSourcePropType): string | null {
  if (typeof source === 'number') {
    const asset = getAssetByID(source);
    if (!asset) return null;
    let scale = asset.scales[0];
    if (asset.scales.length > 1) {
      const preferred = PixelRatio.get();
      scale = asset.scales.reduce((prev, curr) => (Math.abs(curr - preferred) < Math.abs(prev - preferred) ? curr : prev));
    }
    return `${asset.httpServerLocation}/${asset.name}${scale !== 1 ? `@${scale}x` : ''}.${asset.type}`;
  }
  if (typeof source === 'string') return source;
  if (source && !Array.isArray(source) && typeof source.uri === 'string') return source.uri;
  return null;
}
