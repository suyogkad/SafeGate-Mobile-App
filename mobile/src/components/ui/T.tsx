import { Text, type TextProps } from 'react-native';
import type { TypeName } from '../../theme/tokens';
import { useTheme, type Colors } from '../../theme/useTheme';

type Props = TextProps & {
  v?: TypeName;
  color?: keyof Colors;
  /** raw colour for mood words etc. — must come from tokens */
  tint?: string;
  center?: boolean;
  header?: boolean;
};

/** All text goes through here so Comfort settings (size, spacing) apply. Text never animates. */
export function T({ v = 'body', color = 'text', tint, center, header, style, ...rest }: Props) {
  const { c, t } = useTheme();
  return (
    <Text
      accessibilityRole={header ? 'header' : undefined}
      maxFontSizeMultiplier={2}
      {...rest}
      style={[t(v), { color: tint ?? c[color] }, center && { textAlign: 'center' }, style]}
    />
  );
}
