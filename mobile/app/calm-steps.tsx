/**
 * C17 Calm steps — composed. Reuses the calm-mode StepPager (one step per card, "Step N of M" + dashes,
 * Back / Next, Read to me) under a small ActivityBand header. No timer, countdown or auto-advance.
 * After the last step → C27 How are you feeling now? (from calm). Marks `calm` done.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ActivityBand } from '@/components/ActivityBand';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { StepPager } from '@/components/StepPager';
import { T } from '@/components/ui/T';
import { calmActivity } from '@/data/calm';
import { useApp } from '@/store/app';
import { space } from '@/theme/tokens';

export default function CalmSteps() {
  const a = calmActivity(useLocalSearchParams<{ id?: string }>().id ?? 'feet');

  return (
    <Screen header={<Header title={a.title} fallback="/calm" />}>
      <View style={{ gap: space.md }}>
        <ActivityBand activity={a} height={84} rounded="all" />
        <T v="bodyLg" color="textSecondary">
          Go slowly. There's no rush.
        </T>
      </View>
      <StepPager
        steps={a.steps}
        onFinish={() => {
          useApp.getState().markDone('calm');
          router.replace('/feeling-now?from=calm');
        }}
      />
    </Screen>
  );
}
