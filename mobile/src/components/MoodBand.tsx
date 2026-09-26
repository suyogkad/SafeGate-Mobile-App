import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Image, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mood as moodById, type MoodId } from '../data/moods';
import { useMotion } from '../lib/motion';
import { gutter, moodColors, radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { T } from './ui/T';

/**
 * Mood header band: a full-width band in the mood's tint with the
 * character in a white circle, "I'm feeling" and the big mood word in its AA colour. Rounded bottom corners.
 * The character settles in with a small scale only when the child has Movement on; text never animates.
 */
export function MoodBand({ mood, header, children, compact }: { mood: MoodId; header: ReactNode; children?: ReactNode; compact?: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const m = moodById(mood);
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!motion.rich) return;
    pop.setValue(0.88);
    Animated.timing(pop, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.4)), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [mood, motion.rich, pop]);

  const size = compact ? 72 : 132;

  return (
    <View
      style={{
        backgroundColor: moodColors[mood].tint,
        paddingTop: insets.top,
        paddingBottom: space.xl,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        gap: space.md,
      }}
    >
      {header}
      <View style={{ paddingHorizontal: gutter, alignItems: compact ? 'flex-start' : 'center', flexDirection: compact ? 'row' : 'column', gap: compact ? space.lg : space.md }}>
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: size,
            height: size,
            borderRadius: radius.pill,
            backgroundColor: c.bg,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: motion.rich ? pop : 1 }],
            boxShadow: '0px 4px 16px rgba(20,20,20,0.08)',
          }}
        >
          <Image source={m.face} resizeMode="contain" style={{ width: size * 0.68, height: size * 0.68 }} />
        </Animated.View>
        <View style={{ alignItems: compact ? 'flex-start' : 'center', gap: 2, flex: compact ? 1 : undefined }} accessibilityLiveRegion="polite">
          <T v="bodySm" color="textSecondary">
            I'm feeling
          </T>
          <T v={compact ? 'heading' : 'moodLg'} tint={moodColors[mood].word} header>
            {m.label}
          </T>
        </View>
      </View>
      {children ? <View style={{ paddingHorizontal: gutter }}>{children}</View> : null}
    </View>
  );
}
