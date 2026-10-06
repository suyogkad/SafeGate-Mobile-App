/**
 * C10 Speak. A big record control and the bottom actions. Push-to-talk only (tap, or hold and let go).
 * While listening, soft rings pulse slowly out from the button (the familiar "I'm listening" cue); before and after,
 * everything is still. With the phone's reduce-motion on, the rings show but don't move. No waveform.
 * Voice is never the only way: "Type instead" is always there (rule 13).
 * The recording is sent for transcription and the child checks the words on "Is this right?"
 * before anything is sent -- a transcription is never auto-sent.
 */
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { goBack, Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { transcribeSpeech } from '@/api/children';
import { OfflineError } from '@/lib/api';
import { useReduceMotion } from '@/lib/motion';
import { useApp } from '@/store/app';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const HOLD_MS = 500;

export default function Speak() {
  const { c } = useTheme();
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const childId = useApp((s) => s.childId);

  useEffect(() => {
    if (!listening) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [listening]);

  const stopped = useRef(false);
  const stop = async () => {
    if (stopped.current) return;
    stopped.current = true;
    setListening(false);
    live.current = false;
    setWorking(true);

    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || !childId) throw new Error('nothing recorded');

      const heard = await transcribeSpeech(childId, uri);
      if (!heard.trim()) {
        // Silence, or nothing it could make out. Let them try again rather than
        // sending an empty message.
        setProblem("I didn't hear any words. You can try again, or type instead.");
        stopped.current = false;
        setWorking(false);
        return;
      }
      // The child checks and can fix the words before anything is sent (rule 13).
      useApp.getState().setPendingSpeech(null);
      router.replace({ pathname: '/is-this-right', params: { heard } });
    } catch (e) {
      setProblem(
        e instanceof OfflineError
          ? "I can't reach SafeGate right now. You can type instead."
          : "I didn't catch that. You can try again, or type instead.",
      );
      stopped.current = false;
      setWorking(false);
    }
  };

  // Refs, not state: press handlers fire before a re-render, so they must see the latest value.
  const live = useRef(false);
  const holding = useRef(false);

  const start = async () => {
    setProblem(null);
    const granted = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted.granted) {
      // No blame, no error code (rule 15): just the way out.
      setProblem('SafeGate needs permission to use the microphone. You can type instead.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    live.current = true;
    stopped.current = false;
    setSeconds(0);
    setListening(true);
  };
  // Tap (mouse, touch, keyboard, screen reader): first tap starts, next tap stops.
  const onPress = () => void (live.current ? stop() : start());
  // Push-to-talk: hold to talk, let go to stop.
  const onLongPress = () => {
    if (live.current) return;
    holding.current = true;
    void start();
  };
  const onPressOut = () => {
    if (holding.current) void stop();
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
        {working ? 'Just a moment…' : listening ? 'Tap again, or let go, to stop' : 'Hold the button, or tap to start'}
      </T>

      {problem ? (
        <View accessibilityLiveRegion="polite" style={{ paddingHorizontal: space.lg }}>
          <T v="body" color="textSecondary" center>
            {problem}
          </T>
        </View>
      ) : null}

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
