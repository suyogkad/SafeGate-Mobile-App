/**
 * C26 Calm mode (+ C28 emergency order): the quietest screen in the app. Header with Get help only, the step card
 * with dashes, the call-someone card. No characters, emoji, chips, red or timers.
 *
 * The app switches here when something serious comes up (demo: typing "calm" in Talk). No back, no close,
 * no tab bar, and the Android back button does nothing; Get help is always there.
 * The truthful line (calmLead) sits right under the opening line and updates live when a grown-up acts.
 * Emergency order (C28): ?order=emergency, or automatically once a grown-up has asked emergency services to help.
 */
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AccessibilityInfo, BackHandler, View } from 'react-native';
import { CallSomeoneCard } from '@/components/CallSomeoneCard';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { StepPager } from '@/components/StepPager';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { CALM_MODE_ACTIVITY } from '@/data/calm';
import { helpline } from '@/data/helplines';
import { callNumber } from '@/lib/call';
import { calmLead } from '@/lib/calmLead';
import { useApp } from '@/store/app';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const OPENING = "Let's slow things down together.";

export default function CalmMode() {
  const { c } = useTheme();
  const calmMode = useApp((s) => s.calmMode);
  const emergency = useApp((s) => s.emergency);
  const emergencyOrder = useLocalSearchParams<{ order?: string }>().order === 'emergency' || !!emergency;
  const lead = calmLead(calmMode, emergency);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(OPENING);
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // A new truthful line is read out when a grown-up acts.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(lead);
  }, [lead]);

  const n000 = helpline('000');
  const finish = () => router.replace('/feeling-now?from=calmMode');

  const truthful = (
    <Card tone="tint" padding={space.lg}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }} accessibilityLiveRegion="polite">
        <Icon name="heart" size={22} color={c.brand} />
        <T v="bodyLg" color="brand" style={{ flex: 1 }}>
          {lead}
        </T>
      </View>
    </Card>
  );

  const steps = <StepPager steps={CALM_MODE_ACTIVITY.steps} onFinish={finish} />;

  const emergencyBlock = (
    <Card tone="help" padding={space.lg}>
      <View style={{ gap: space.md }}>
        <T v="heading" tint={c.onHelpTint}>
          If you are in danger right now.
        </T>
        <Button title="Call 000" variant="help" iconLeft="phone" label="Call 000, emergency services" onPress={() => callNumber(n000.number, 'emergency services')} />
      </View>
    </Card>
  );

  return (
    <Screen header={<Header left="none" />}>
      <T v="title" header>
        {OPENING}
      </T>
      {truthful}
      {emergencyOrder ? (
        <>
          {emergencyBlock}
          <CallSomeoneCard contacts={['kids-helpline', 'lifeline']} />
          {steps}
        </>
      ) : (
        <>
          {steps}
          <CallSomeoneCard />
        </>
      )}
    </Screen>
  );
}
