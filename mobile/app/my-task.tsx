/**
 * C21 My task. A navy task panel with the title and its progress, the steps as tick rows in a raised card, and an
 * "All done!" card. Progress IS shown here ("2 of 5 steps"): it's one task, not a score.
 * No points, no confetti, no strike-through, no tab bar. Ticks animate only when the child has Movement on.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear, Stagger } from '@/components/ui/Appear';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { ART, FACES } from '@/data/faces';
import { TASKS } from '@/data/talk';
import { useMotion } from '@/lib/motion';
import { useApp } from '@/store/app';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function MyTask() {
  const { c } = useTheme();
  const TASK = TASKS[useApp((s) => s.taskId)];
  const done = useApp((s) => s.taskDone);
  const toggleStep = useApp((s) => s.toggleStep);
  const resetTask = useApp((s) => s.resetTask);
  const count = done.filter(Boolean).length;
  const all = count === TASK.steps.length;

  useEffect(() => {
    if (all) useApp.getState().markDone('tasks');
  }, [all]);

  return (
    <Screen header={<Header title="My task" fallback="/home" />}>
      {/* Task header — navy panel */}
      <Appear>
        <View style={{ backgroundColor: c.brand, borderRadius: radius.panel, padding: space.xl, overflow: 'hidden', gap: space.lg }}>
          <Image
            source={FACES.crownEgg}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ position: 'absolute', right: -10, top: -8, width: 84, height: 112, transform: [{ rotate: '8deg' }] }}
          />
          <View style={{ gap: space.xs, paddingRight: 64 }}>
            <T v="caption" color="onBrand" style={{ opacity: 0.85 }}>
              TODAY'S TASK
            </T>
            <T v="title" color="onBrand" header>
              {TASK.title}
            </T>
          </View>
          <View style={{ gap: space.sm }} accessible accessibilityLabel={all ? 'All steps done' : `${count} of ${TASK.steps.length} steps done`}>
            <View style={{ flexDirection: 'row', gap: space.xs }}>
              {TASK.steps.map((_, i) => (
                <View key={i} style={{ flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: done[i] ? c.onBrand : 'rgba(255,255,255,0.28)' }} />
              ))}
            </View>
            <T v="bodySmMedium" color="onBrand">
              {all ? 'done' : `${count} of ${TASK.steps.length} steps`}
            </T>
          </View>
        </View>
      </Appear>

      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <T v="section" header>
            Steps
          </T>
          <Badge label="from your AI companion" />
        </View>
        <Card tone="raised" r={24} padding={space.sm}>
          <Stagger>
            {TASK.steps.map((s, i) => (
              <StepRow key={s} n={i + 1} text={s} done={done[i]} last={i === TASK.steps.length - 1} onPress={() => toggleStep(i)} />
            ))}
          </Stagger>
        </Card>
      </View>

      {all ? (
        <Appear>
          <Card tone="raised" r={24} padding={space.xl}>
            <View style={{ alignItems: 'center', gap: space.sm }} accessibilityLiveRegion="polite">
              <Image source={ART.cheer} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" style={{ width: 96, height: 96 }} />
              <T v="title" center header>
                All done!
              </T>
              <T v="body" color="textSecondary" center>
                You did every step.
              </T>
              <Button title="Start again" variant="text" iconLeft="rotate-ccw" onPress={resetTask} />
            </View>
          </Card>
        </Appear>
      ) : null}
    </Screen>
  );
}

function StepRow({ n, text, done, last, onPress }: { n: number; text: string; done: boolean; last: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const motion = useMotion();
  const v = useRef(new Animated.Value(done ? 1 : 0)).current;

  useEffect(() => {
    if (motion.rich) Animated.timing(v, { toValue: done ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    else v.setValue(done ? 1 : 0);
  }, [done, motion.rich, v]);

  return (
    <Tappable
      label={`Step ${n}: ${text}`}
      role="checkbox"
      checked={done}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.divider }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: radius.pill,
          borderWidth: 2,
          borderColor: done ? c.primary : c.track,
          backgroundColor: done ? c.primary : c.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done ? (
          <Animated.View style={{ transform: [{ scale: motion.rich ? v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) : 1 }] }}>
            <Icon name="check" size={16} color={c.onPrimary} />
          </Animated.View>
        ) : (
          <T v="caption" color="textMuted">
            {n}
          </T>
        )}
      </View>
      <T v="bodyLg" color={done ? 'textMuted' : 'text'} style={{ flex: 1 }}>
        {text}
      </T>
      {done ? (
        <T v="caption" color="textMuted">
          done
        </T>
      ) : null}
    </Tappable>
  );
}
