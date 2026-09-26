import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { readAloud, stopReading } from '../lib/speak';
import { useApp } from '../store/app';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { StepDashes } from './ui/bits';
import { Button } from './ui/Button';
import { T } from './ui/T';

/**
 * One step per card, large text, "Step N of M" + dashes, Back / Next, "Read to me".
 * Used by calm mode (C26) and Calm steps (C17). No timer, no countdown, no auto-advance. Text never animates.
 */
export function StepPager({ steps, onFinish, finishLabel = 'Done' }: { steps: string[]; onFinish: () => void; finishLabel?: string }) {
  const { c } = useTheme();
  const readAloudOn = useApp((s) => s.comfort.readAloud);
  const [i, setI] = useState(0);
  const last = i === steps.length - 1;

  useEffect(() => () => stopReading(), []);

  return (
    <View style={{ gap: space.lg }}>
      <StepDashes step={i + 1} total={steps.length} />
      <View
        accessibilityLiveRegion="polite"
        style={{ backgroundColor: c.surface, borderRadius: radius.panel, padding: space.xl, minHeight: 168, justifyContent: 'center' }}
      >
        <T v="title">{steps[i]}</T>
      </View>
      {readAloudOn ? (
        <Button title="Read to me" size="small" variant="outline" iconLeft="volume-2" label={`Read step ${i + 1} to me`} onPress={() => readAloud(steps[i])} />
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button title="Back" variant="outline" iconLeft="arrow-left" disabled={i === 0} style={{ flex: 1 }} onPress={() => setI((n) => Math.max(0, n - 1))} />
        <Button
          title={last ? finishLabel : 'Next'}
          icon={last ? 'check' : 'arrow-right'}
          style={{ flex: 1 }}
          onPress={() => {
            stopReading();
            if (last) onFinish();
            else setI((n) => n + 1);
          }}
        />
      </View>
    </View>
  );
}
