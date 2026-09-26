import { Image, type ImageSourcePropType } from 'react-native';

/** The URI React Native loads for a bundled image (native). The web version is imageUri.web.ts. */
export function imageUri(source: ImageSourcePropType): string | null {
  return Image.resolveAssetSource(source as number)?.uri ?? null;
}
