import { View } from 'react-native';
import { radius, size, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Icon, type IconName } from './Icon';
import { T } from './T';
import { Tappable } from './Tappable';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  emoji?: string;
  /** multi-select chips are checkboxes to assistive tech */
  multi?: boolean;
  /** one-of-many chips (e.g. picking a time) are radio buttons to assistive tech */
  radio?: boolean;
  /** accessible name when it should say more than the visible label ("Monday 4:00 pm, open time") */
  a11yLabel?: string;
};

/** Chips: 40 h pill, white with a visible edge → selected blue500 + white. Selected also shows a tick (not colour alone). */
export function Chip({ label, selected, onPress, icon, emoji, multi, radio, a11yLabel }: Props) {
  const { c } = useTheme();
  const fg = selected ? c.onPrimary : c.text;
  return (
    <Tappable
      label={a11yLabel ?? label}
      onPress={onPress}
      role={multi ? 'checkbox' : radio ? 'radio' : 'button'}
      checked={multi || radio ? !!selected : undefined}
      selected={selected}
      visualHeight={size.chip}
      style={{
        minHeight: size.chip,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        backgroundColor: selected ? c.primary : c.bg,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.chipBorder,
        justifyContent: 'center',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
        {selected && <Icon name="check" size={16} color={fg} />}
        {!selected && icon && <Icon name={icon} size={16} color={fg} />}
        {emoji ? <T v="bodySm">{emoji}</T> : null}
        <T v="bodySm" tint={fg}>
          {label}
        </T>
      </View>
    </Tappable>
  );
}

export function ChipRow({ children, wrap = true }: { children: React.ReactNode; wrap?: boolean }) {
  return <View style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: space.sm }}>{children}</View>;
}
