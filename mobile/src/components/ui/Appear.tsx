import { Children, useEffect, useRef, type ReactNode } from 'react';
import { Animated, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useMotion } from '../../lib/motion';
import { motion as motionTokens } from '../../theme/tokens';

/**
 * Entrance fade. Child: 150 ms opacity only (a small rise too when the child turns Movement on).
 * Parent: 250 ms fade with a 12 px rise.
 * Reduce-motion: renders straight away. Fail-safe: content is forced visible after 600 ms
 * so nothing can stay invisible if an animation never runs (e.g. a backgrounded tab).
 */
export function Appear({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const m = useMotion();
  const v = useRef(new Animated.Value(m.enabled ? 0 : 1)).current;

  useEffect(() => {
    if (!m.enabled) {
      v.setValue(1);
      return;
    }
    const anim = Animated.timing(v, { toValue: 1, duration: m.fade, delay, useNativeDriver: Platform.OS !== 'web' });
    anim.start();
    const failSafe = setTimeout(() => v.setValue(1), delay + motionTokens.failSafe);
    return () => {
      anim.stop();
      clearTimeout(failSafe);
    };
  }, [m.enabled, m.fade, delay, v]);

  const rise = m.rich ? v.interpolate({ inputRange: [0, 1], outputRange: [m.child ? 8 : 12, 0] }) : 0;
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: rise }] }]}>{children}</Animated.View>;
}

/**
 * Staggered entrance for a list of blocks (parent setup, sign-in, option lists): each child fades/rises in 60 ms
 * after the one before. Child screens only stagger when Movement is on; otherwise it's the single short fade.
 */
export function Stagger({ children, step = 60, start = 0 }: { children: ReactNode; step?: number; start?: number }) {
  const m = useMotion();
  const items = Children.toArray(children);
  return (
    <>
      {items.map((ch, i) => (
        <Appear key={i} delay={m.rich ? start + i * step : 0}>
          {ch}
        </Appear>
      ))}
    </>
  );
}
