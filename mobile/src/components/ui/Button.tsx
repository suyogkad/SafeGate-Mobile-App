import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, size, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Icon, type IconName } from './Icon';
import { T } from './T';
import { Tappable } from './Tappable';

export type ButtonVariant = 'primary' | 'outline' | 'text' | 'help' | 'soft' | 'onBrand';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'block' | 'small';
  icon?: IconName;
  iconLeft?: IconName;
  disabled?: boolean;
  /** Accessibility label when the visible title isn't enough ("Call Kids Helpline on 1800 55 1800"). */
  label?: string;
  /** On a tinted card (companion, help): outline/text buttons use navy `brand`, because `primary` blue fails contrast there. */
  onTint?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Pill buttons, blue primary. Block = full width, 48 h; small = 36 h (14 px text, 16 px icon).
 * `help` is the solid amber emergency button (Call 000). `onBrand` is the outline-white button on navy panels.
 */
export function Button({ title, onPress, variant = 'primary', size: sz = 'block', icon, iconLeft, disabled, label, onTint, style }: Props) {
  const { c } = useTheme();
  // Visual sizes 48 / 36; Tappable grows the hit area to 56.
  const height = sz === 'small' ? size.buttonSmall : size.button;

  const look = {
    primary: { bg: c.primary, fg: c.onPrimary, border: 'transparent' },
    // Outline buttons get a white fill so their blue text always sits on white, whatever the page or card behind.
    outline: { bg: c.bg, fg: onTint ? c.brand : c.primary, border: onTint ? c.brand : c.primary },
    // Text buttons sit straight on the page backgrounds, where bright blue falls under 4.5:1, so they use navy.
    text: { bg: 'transparent', fg: c.brand, border: 'transparent' },
    help: { bg: c.help, fg: c.onHelp, border: 'transparent' },
    soft: { bg: c.surfaceTint, fg: c.brand, border: 'transparent' },
    onBrand: { bg: 'transparent', fg: c.onBrand, border: c.onBrand },
  }[variant];
  const bg = disabled && variant !== 'text' ? c.disabledBg : look.bg;
  const fg = disabled ? c.disabledText : look.fg;
  const border = disabled ? 'transparent' : look.border;

  return (
    <Tappable
      label={label ?? title}
      onPress={onPress}
      disabled={disabled}
      visualHeight={height}
      style={[
        styles.base,
        {
          height,
          backgroundColor: bg,
          borderColor: border,
          paddingLeft: variant === 'text' ? space.xs : space.lg,
          paddingRight: variant === 'text' ? space.xs : sz === 'small' ? space.sm + 4 : space.lg,
          alignSelf: sz === 'small' || variant === 'text' ? 'flex-start' : 'stretch',
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {iconLeft && <Icon name={iconLeft} size={sz === 'small' ? 16 : 20} color={fg} />}
        <T v={sz === 'small' ? 'bodySmMedium' : 'label'} tint={fg} numberOfLines={2} center>
          {title}
        </T>
        {icon && <Icon name={icon} size={sz === 'small' ? 16 : 20} color={fg} />}
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
