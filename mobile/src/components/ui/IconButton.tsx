import type { StyleProp, ViewStyle } from 'react-native';
import { radius, size as sizes } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Icon, type IconName } from './Icon';
import { Tappable } from './Tappable';

type Props = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: 'soft' | 'plain' | 'primary' | 'help';
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Icon button: 48 circle, blue50 fill, blue icon. `plain` = bare nav icon. */
export function IconButton({ icon, label, onPress, variant = 'soft', size = sizes.iconButton, disabled, style }: Props) {
  const { c } = useTheme();
  const look = {
    soft: { bg: c.surfaceTint, fg: c.primary },
    plain: { bg: 'transparent', fg: c.text },
    primary: { bg: c.primary, fg: c.onPrimary },
    help: { bg: c.help, fg: c.onHelp },
  }[variant];
  return (
    <Tappable
      label={label}
      onPress={onPress}
      disabled={disabled}
      visualHeight={size}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: disabled ? c.disabledBg : look.bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon name={icon} size={24} color={disabled ? c.disabledText : look.fg} />
    </Tappable>
  );
}
