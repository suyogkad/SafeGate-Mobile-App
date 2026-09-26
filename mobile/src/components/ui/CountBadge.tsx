import { View } from 'react-native';
import { countLabel } from '../../data/notifications';
import { fonts, radius } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { T } from './T';

/**
 * Unread count pill for the parent (and later therapist) areas only: never in the child app.
 * Amber with black text (never red), "9+" above nine, and a 2 px ring in the colour it sits on so it reads apart
 * from the icon. Hidden from screen readers: the button's own label says "2 new". It never pulses.
 */
export function CountBadge({ count, ring }: { count: number; ring: string }) {
  const { c } = useTheme();
  if (count <= 0) return null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        position: 'absolute',
        top: -6,
        right: -8,
        minWidth: 22,
        height: 22,
        paddingHorizontal: 5,
        borderRadius: radius.pill,
        backgroundColor: c.help,
        borderWidth: 2,
        borderColor: ring,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <T v="caption" tint={c.onHelp} allowFontScaling={false} style={{ fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 }}>
        {countLabel(count)}
      </T>
    </View>
  );
}
