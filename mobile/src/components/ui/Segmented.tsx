import { View } from 'react-native';
import { radius, shadow, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { T } from './T';
import { Tappable } from './Tappable';

/** Segmented control built from chips: grey100 pill track, white selected segment. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly V[];
  value: V;
  onChange: (v: V) => void;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', backgroundColor: c.chip, borderWidth: 1, borderColor: c.chipBorder, borderRadius: radius.pill, padding: 4 }}
    >
      {options.map((o) => {
        const on = o === value;
        return (
          <Tappable
            key={o}
            label={o}
            role="tab"
            selected={on}
            visualHeight={40}
            onPress={() => onChange(o)}
            style={{
              flex: 1,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: on ? c.bg : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: space.sm,
              ...(on ? shadow.lift : null),
            }}
          >
            <T v="bodySmMedium" color={on ? 'text' : 'textMuted'} numberOfLines={1}>
              {o}
            </T>
          </Tappable>
        );
      })}
    </View>
  );
}
