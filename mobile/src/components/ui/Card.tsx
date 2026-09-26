import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, shadow, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Tappable } from './Tappable';

export type CardTone = 'surface' | 'outlined' | 'tint' | 'help' | 'brand' | 'plain' | 'raised';

type Props = {
  children: ReactNode;
  tone?: CardTone;
  /** makes the whole card a button */
  onPress?: () => void;
  label?: string;
  padding?: number;
  r?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Cards: `surface` grey50 radius 16 (check-in card), `outlined` white + hairline border (session card),
 * `tint` blue50 (companion), `help` amber tint (emergency), `brand` navy panel.
 */
export function Card({ children, tone = 'surface', onPress, label, padding = space.xl, r = radius.card, style }: Props) {
  const { c } = useTheme();
  const look: ViewStyle = {
    surface: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.cardBorder },
    outlined: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.cardBorder },
    tint: { backgroundColor: c.surfaceTint },
    help: { backgroundColor: c.helpTint },
    brand: { backgroundColor: c.brand },
    plain: { backgroundColor: c.bg },
    // white card lifted off a branded background
    raised: { backgroundColor: c.bg, ...shadow.lift },
  }[tone];
  const base: StyleProp<ViewStyle> = [{ borderRadius: r, padding }, look, style];
  if (onPress) {
    return (
      <Tappable label={label ?? 'Open'} onPress={onPress} style={base}>
        {children}
      </Tappable>
    );
  }
  return <View style={base}>{children}</View>;
}
