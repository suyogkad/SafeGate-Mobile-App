import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { useMotion } from '../lib/motion';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * "How do you feel?" bubbles: blue50 circles with navy 14 px words, scattered; the selected
 * ones fill navy with white words and a ✓ (never colour alone). Multi-select.
 * With Movement on, a picked bubble grows gently (200 ms); otherwise the change is instant.
 */
export function FeelingBubbles({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (f: string) => void }) {
  return (
    <View accessibilityLabel="Feelings. Pick as many as fit." style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: space.sm, rowGap: 2 }}>
      {options.map((f, i) => (
        <Bubble key={f} label={f} on={selected.includes(f)} onPress={() => onToggle(f)} size={f.length > 7 ? 92 : 80} offset={i % 2 ? 14 : 0} />
      ))}
    </View>
  );
}

function Bubble({ label, on, onPress, size, offset }: { label: string; on: boolean; onPress: () => void; size: number; offset: number }) {
  const { c } = useTheme();
  const motion = useMotion();
  const s = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    if (motion.rich) {
      Animated.timing(s, { toValue: on ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    } else {
      s.setValue(on ? 1 : 0);
    }
  }, [on, motion.rich, s]);

  const scale = motion.rich ? s.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) : 1;

  return (
    <Tappable label={label} role="checkbox" checked={on} selected={on} onPress={onPress} style={{ marginTop: offset }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: on ? c.brand : c.surfaceTint,
          alignItems: 'center',
          justifyContent: 'center',
          padding: space.sm,
          gap: 2,
          transform: [{ scale }],
        }}
      >
        {on ? <Icon name="check" size={14} color={c.onBrand} /> : null}
        <T v="bodySmMedium" tint={on ? c.onBrand : c.brand} center numberOfLines={2}>
          {label}
        </T>
      </Animated.View>
    </Tappable>
  );
}
