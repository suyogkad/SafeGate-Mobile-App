import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useMotion } from '../lib/motion';
import { backdrops, type BackdropName } from '../theme/tokens';

/**
 * Branded page background (HANDOFF.md §6.6): a soft top-to-bottom wash in the brand blues with three blurred glows
 * (radial gradients, so the edges fade out). Echoes the Welcome screen's pale blue curve behind the characters.
 *
 * Motion is tiered (product rule 10): the glows drift very slowly on parent and login screens; on child screens they
 * are still unless the child turns Movement on; reduce-motion keeps everything still. `still` forces it off
 * (calm mode). Decorative only — hidden from assistive tech.
 */
export function Backdrop({ name = 'soft', still }: { name?: BackdropName; still?: boolean }) {
  const b = backdrops[name];
  const m = useMotion();
  const move = !still && m.enabled && m.rich;
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!move) {
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(t, { toValue: 0, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [move, t]);

  const drift = (dx: number, dy: number) => ({
    transform: [
      { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
      { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
    ],
  });

  const glows: { color: string; opacity: number; size: number; style: object; dx: number; dy: number }[] = [
    { ...b.glows[0], size: 420, style: { top: -140, right: -160 }, dx: -36, dy: 28 },
    { ...b.glows[1], size: 360, style: { top: 260, left: -190 }, dx: 40, dy: -24 },
    { ...b.glows[2], size: 400, style: { bottom: -170, right: -150 }, dx: -30, dy: -34 },
  ];

  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={b.wash} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      {glows.map((g, i) => (
        <Animated.View key={i} style={[{ position: 'absolute', width: g.size, height: g.size }, g.style, drift(g.dx, g.dy)]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id={`g${name}${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={g.color} stopOpacity={g.opacity} />
                <Stop offset="60%" stopColor={g.color} stopOpacity={g.opacity * 0.45} />
                <Stop offset="100%" stopColor={g.color} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill={`url(#g${name}${i})`} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}
