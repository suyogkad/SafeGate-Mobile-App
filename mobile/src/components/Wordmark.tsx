import { Image, View } from 'react-native';
import { ART } from '../data/faces';

/** Width ÷ height of the wordmark artwork (assets/brand/wordmark.png). */
const RATIO = 1350 / 240;

/**
 * The SafeGate logo: the wordmark with the G mark's orange dot, from the brand artwork (not text, so it always matches
 * the brand). `size` keeps the old font-size scale: the logo is about as tall as a capital letter at that size.
 * Doesn't scale with Comfort settings.
 */
export function Wordmark({ size = 54 }: { size?: number }) {
  const height = Math.round(size * 0.82);
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="SafeGate">
      <Image source={ART.wordmark} resizeMode="contain" style={{ width: Math.round(height * RATIO), height }} />
    </View>
  );
}

/** The G mark on its own (the app icon's symbol), for the splash. */
export function LogoMark({ size = 88 }: { size?: number }) {
  return <Image source={ART.mark} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" style={{ width: size, height: size }} />;
}
