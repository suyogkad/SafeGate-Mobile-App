/**
 * P07 Alex's comfort settings. Value rows, switch rows and a live preview card, inside the setup shell.
 * The same settings the child has in their own app. There is no endpoint for them yet,
 * so they apply to the phone they are set on and do not travel to the child's phone --
 * the note below says so, because a parent who thinks they have made their child's app
 * easier to use when they have not is worse off than one who knows to do it there.
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
      <Card tone="raised" padding={space.lg}>
        <T v="bodySm" color="textSecondary">
          These settings apply to this phone. {name} can set their own in their app, under You.
        </T>
      </Card>
    </SetupShell>
  );
}
