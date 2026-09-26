import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, View } from 'react-native';
import { useMotion } from '../lib/motion';
import { MOODS, type MoodId } from '../data/moods';
import { moodColors, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * Five moods, left to right (Bad · Not great · Ok · Good · Great), each a character in its mood tint with
 * its word underneath — colour is never the only signal.
 * Selected = white ring + bold word + accessibilityState. It grows a little only when the child has Movement on
 * (200 ms ease-out); otherwise the change is instant.
 */
export function MoodPicker({ value, onChange }: { value: MoodId; onChange: (m: MoodId) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="How do you feel?" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {MOODS.map((m) => (
        <MoodDot key={m.id} id={m.id} selected={m.id === value} onPress={() => onChange(m.id)} />
      ))}
    </View>
  );
}

function MoodDot({ id, selected, onPress }: { id: MoodId; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const motion = useMotion();
  const mood = MOODS.find((m) => m.id === id)!;
  const s = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    if (motion.rich) {
      Animated.timing(s, { toValue: selected ? 1 : 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    } else {
      s.setValue(selected ? 1 : 0);
    }
  }, [selected, motion.rich, s]);

  const scale = motion.rich ? s.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) : 1;

  return (
    <Tappable label={mood.label} role="radio" checked={selected} selected={selected} onPress={onPress} style={{ alignItems: 'center', gap: space.xs, width: 62 }}>
      <Animated.View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: moodColors[id].tint,
          borderWidth: 3,
          borderColor: selected ? c.bg : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
          ...(selected ? { boxShadow: '0px 2px 8px rgba(20,20,20,0.14)' } : null),
        }}
      >
        <Image source={mood.face} resizeMode="contain" style={{ width: 38, height: 38 }} />
      </Animated.View>
      <T v="caption" tint={selected ? moodColors[id].word : c.textSecondary} center style={selected ? { fontFamily: 'PlusJakartaSans_700Bold' } : undefined}>
        {mood.label}
      </T>
    </Tappable>
  );
}
