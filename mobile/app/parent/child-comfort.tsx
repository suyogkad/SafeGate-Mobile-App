/**
 * P07 Alex's comfort settings. Value rows, switch rows and a live preview card, inside the setup shell.
 * Same settings as the child's own Comfort settings (shared store), so Alex can change them too.
 * During setup Next → Link Alex's phone; opened from Home/Account (?from=home) it's "Done" and goes back.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { CheckinCard } from '@/components/CheckinCard';
import { ComfortSettings } from '@/components/ComfortSettings';
import { goBack } from '@/components/Header';
import { SetupShell } from '@/components/SetupShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FaceCircle } from '@/components/ui/bits';
import { T } from '@/components/ui/T';
import { HOME_ROWS } from '@/data/day';
import { FACES } from '@/data/faces';
import { useChildName } from '@/store/app';
import { artTints, space } from '@/theme/tokens';
import { AudienceProvider } from '@/lib/motion';

export default function ChildComfort() {
  const name = useChildName();
  const fromHome = useLocalSearchParams<{ from?: string }>().from === 'home';
  const row = HOME_ROWS.checkin;

  return (
    <SetupShell
      phase={fromHome ? undefined : 2}
      face={FACES.smileFlower}
      tint={artTints.lavender}
      title={`${name}'s comfort`}
      subtitle={`Set how SafeGate looks and sounds for ${name}. ${name} can change these too.`}
      fallback="/parent/home"
      footer={
        fromHome ? (
          <Button title="Done" icon="check" onPress={() => goBack('/parent/home')} />
        ) : (
          <Button title="Next" icon="arrow-right" onPress={() => router.push('/parent/link-child')} />
        )
      }
    >
      <Card tone="raised" r={24} padding={space.lg}>
        <View style={{ gap: space.md }}>
          <T v="caption" color="textMuted">
            PREVIEW
          </T>
          <T v="bodySm" color="textSecondary">
            This is how text looks for {name}.
          </T>
          {/* Rendered as the child sees it, so the preview follows these settings live. */}
          <AudienceProvider value="child">
            <CheckinCard caption={row.tag} title={row.title} right={<FaceCircle face={FACES[row.face]} tint={artTints[row.tint]} size={64} />} />
          </AudienceProvider>
        </View>
      </Card>
      <ComfortSettings />
    </SetupShell>
  );
}
