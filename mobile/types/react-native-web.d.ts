/** React Native Web's asset registry: the same one its <Image> reads, used to preload images on web. */
declare module 'react-native-web/dist/modules/AssetRegistry' {
  export function getAssetByID(id: number): { httpServerLocation: string; name: string; type: string; scales: number[] } | undefined;
}

/** React Native Web's image cache: an <Image> whose URI is in it renders "loaded" on its first frame. */
declare module 'react-native-web/dist/modules/ImageLoader' {
  export class ImageUriCache {
    static add(uri: string): void;
    static remove(uri: string): void;
    static has(uri: string): boolean;
  }
}
