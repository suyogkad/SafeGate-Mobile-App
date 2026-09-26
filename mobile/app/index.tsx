/**
 * C01 Splash: the SafeGate logo (the G mark above the wordmark) centred on white. Nothing else: no spinner or progress.
 *
 * Brand moment: the wordmark shows, then fades away; a subtle ripple of soft gradient rings spreads from the
 * centre while Welcome's own background fades in underneath, then Welcome takes over seamlessly (~2.3 s, once).
 * The phone's reduce-motion setting skips the ripple (wordmark, then Welcome). This runs before anyone has chosen
 * a side, so the child's Movement setting doesn't apply yet.
 */
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Backdrop } from '@/components/Backdrop';
import { LogoMark, Wordmark } from '@/components/Wordmark';
import { ensureRestored } from '@/lib/auth';
import { useReduceMotion } from '@/lib/motion';
import { colors, palette } from '@/theme/tokens';

const RINGS = [palette.blue100, '#CBC5ED', palette.blue50];

export default function Splash() {
  const reduce = useReduceMotion();
  // Where to go once the brand moment is over: Welcome, or straight back into
  // whichever session this device already holds.
  const target = useRef<string>('/welcome');
  useEffect(() => {
    let alive = true;
    ensureRestored().then((to) => {
      if (alive) target.current = to;
    });
    return () => {
      alive = false;
    };
  }, []);
  const win = useWindowDimensions();
  const size = Math.hypot(Math.min(win.width, 430), win.height); // big enough to reach every corner
  const word = useRef(new Animated.Value(0)).current;
  const bg = useRef(new Animated.Value(0)).current;
  const rings = useRef(RINGS.map(() => new Animated.Value(0))).current;

  // Fail-safe: never get stuck on the splash, whatever happens to the animation.
  useEffect(() => {
    const t = setTimeout(() => router.replace(target.current as never), 3600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (reduce) {
      word.setValue(1);
      const t = setTimeout(() => router.replace(target.current as never), 1200);
      return () => clearTimeout(t);
    }
    const native = Platform.OS !== 'web';
    const anim = Animated.sequence([
      // 1. The wordmark shows…
      Animated.timing(word, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.delay(520),
      // 2. …and fades away.
      Animated.timing(word, { toValue: 0, duration: 360, easing: Easing.in(Easing.cubic), useNativeDriver: native }),
      // 3. A subtle ripple spreads while Welcome's background fades in.
      Animated.parallel([
        ...rings.map((r, i) =>
          Animated.timing(r, { toValue: 1, duration: 1100, delay: i * 170, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        ),
        Animated.timing(bg, { toValue: 1, duration: 900, delay: 250, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ]),
    ]);
    // 4. Welcome.
    anim.start(({ finished }) => finished && router.replace(target.current as never));
    return () => anim.stop();
  }, [reduce, word, bg, rings]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="SafeGate">
      {/* Welcome's own background, fading in under the ripple so the hand-off is seamless. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: bg }]}>
        <Backdrop name="soft" still />
      </Animated.View>

      {!reduce
        ? rings.map((r, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                position: 'absolute',
                width: size,
                height: size,
                opacity: r.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
                transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.08, 1.1] }) }],
              }}
            >
              <Svg width="100%" height="100%" viewBox="0 0 100 100">
                <Defs>
                  {/* A soft ring: clear centre, gentle band of colour, clear edge. */}
                  <RadialGradient id={`ring${i}`} cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={RINGS[i]} stopOpacity={0} />
                    <Stop offset="0.55" stopColor={RINGS[i]} stopOpacity={0.15} />
                    <Stop offset="0.8" stopColor={RINGS[i]} stopOpacity={0.7} />
                    <Stop offset="1" stopColor={RINGS[i]} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx="50" cy="50" r="50" fill={`url(#ring${i})`} />
              </Svg>
            </Animated.View>
          ))
        : null}

      <Animated.View style={{ alignItems: 'center', gap: 20, opacity: word, transform: [{ scale: word.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }}>
        <LogoMark size={96} />
        <Wordmark size={48} />
      </Animated.View>
    </View>
  );
}
