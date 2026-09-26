import { View } from 'react-native';
import { radius, size, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { T } from './T';

export type BadgeTone = 'info' | 'warn' | 'success' | 'neutral' | 'help' | 'brand';

/** Status pill badge. There is no red tone, on purpose. */
export function Badge({ label, tone = 'info' }: { label: string; tone?: BadgeTone }) {
  const { c } = useTheme();
  const look = {
    info: { bg: c.surfaceTint, fg: c.brand },
    warn: { bg: c.warnTint, fg: c.onWarnTint },
    success: { bg: c.successTint, fg: c.onSuccessTint },
    neutral: { bg: c.chip, fg: c.textSecondary },
    help: { bg: c.helpTint, fg: c.onHelpTint },
    brand: { bg: c.brand, fg: c.onBrand },
  }[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        minHeight: size.badge,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        backgroundColor: look.bg,
        justifyContent: 'center',
      }}
    >
      <T v="caption" tint={look.fg}>
        {label}
      </T>
    </View>
  );
}
