/**
 * C10 Speak. A big record control and the bottom actions. Push-to-talk only (tap, or hold and let go).
 * While listening, soft rings pulse slowly out from the button (the familiar "I'm listening" cue); before and after,
 * everything is still. With the phone's reduce-motion on, the rings show but don't move. No waveform.
 * The demo records nothing. Voice is never the only way: "Type instead" is always there.
 */
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { goBack, Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { useReduceMotion } from '@/lib/motion';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const HOLD_MS = 500;

export default function Speak() {
  const { c } = useTheme();
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!listening) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [listening]);

  // TODO(safegate): a real build records here and sends audio to speech-to-text.
  const stopped = useRef(false);
  const stop = () => {
    if (stopped.current) return;
    stopped.current = true;
    router.replace('/is-this-right');
  };

  // Refs, not state: press handlers fire before a re-render, so they must see the latest value.
  const live = useRef(false);
  const holding = useRef(false);

  const start = () => {
    live.current = true;
    setSeconds(0);
    setListening(true);
  };
  // Tap (mouse, touch, keyboard, screen reader): first tap starts, next tap stops.
  const onPress = () => (live.current ? stop() : start());
  // Push-to-talk: hold to talk, let go to stop.
  const onLongPress = () => {
    if (live.current) return;
    holding.current = true;
    start();
  };
  const onPressOut = () => {
    if (holding.current) stop();
  };

  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <Screen
      header={<Header title="Talk" left="close" fallback="/talk" />}
      footer={
        <View style={{ gap: space.sm }}>
          <Button title="Type instead" variant="outline" iconLeft="type" onPress={() => goBack('/talk')} />
          <Button title="Cancel" variant="text" style={{ alignSelf: 'center' }} onPress={() => goBack('/talk')} />
        </View>
      }
      contentStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <T v="bodyLg" color="textMuted" center>
        {listening ? 'Tap again, or let go, to stop' : 'Hold the button, or tap to start'}
      </T>

      <View style={{ width: 156, height: 156, alignItems: 'center', justifyContent: 'center' }}>
        {listening ? <ListeningRings color={c.primary} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop' : 'Start speaking'}
        accessibilityHint={listening ? undefined : 'Hold the button, or tap to start'}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={HOLD_MS}
        onPressOut={onPressOut}
        style={{
          width: 156,
          height: 156,
          borderRadius: radius.pill,
          backgroundColor: listening ? c.brand : c.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={listening ? 'square' : 'mic'} size={48} color={c.onPrimary} />
      </Pressable>
      </View>

      <T v="label" center>
        {listening ? 'Stop' : 'Start'}
      </T>

      {listening ? (
        <View style={{ alignItems: 'center', gap: space.xs }} accessibilityLiveRegion="polite">
          <T v="title" center header>
            Listening…
          </T>
          <T v="bodyLg" color="textMuted" center accessibilityLabel={`${seconds} seconds`}>
            {time}
          </T>
        </View>
      ) : null}
    </Screen>
  );
}

const RING_MS = 1800;

/**
 * Two soft rings that grow out from the record button and fade, one after the other, while it's listening.
 * Slow and low-contrast on purpose. Reduce-motion: the rings stay still (the cue is still there, nothing moves).
 */
function ListeningRings({ color }: { color: string }) {
  const reduce = useReduceMotion();
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) {
      a.setValue(0.35);
      b.setValue(0.7);
      return;
    }
    const native = Platform.OS !== 'web';
    const ring = (v: Animated.Value) =>
      Animated.loop(Animated.timing(v, { toValue: 1, duration: RING_MS, easing: Easing.out(Easing.quad), useNativeDriver: native }));
    const first = ring(a);
    first.start();
    const later = setTimeout(() => ring(b).start(), RING_MS / 2);
    return () => {
      first.stop();
      clearTimeout(later);
      b.stopAnimation();
      a.setValue(0);
      b.setValue(0);
    };
  }, [reduce, a, b]);

  const style = (v: Animated.Value) => ({
    position: 'absolute' as const,
    width: 156,
    height: 156,
    borderRadius: radius.pill,
    backgroundColor: color,
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
  });

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ pointerEvents: 'none', position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={style(a)} />
      <Animated.View style={style(b)} />
    </View>
  );
}
