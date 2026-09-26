/**
 * C24 About SafeGate. Wordmark + collage, the emergency note with Call 000, and three plain facts (what SafeGate is,
 * the AI companion is a computer program not a person, who can read what you write).
 * Also opened from the parent's Account ("How SafeGate works", ?from=parent), where the child's Get help is hidden.
 */
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { EmergencyNote } from '@/components/EmergencyNote';
import { FaceCollage } from '@/components/FaceCollage';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Wordmark } from '@/components/Wordmark';
import { Appear, Stagger } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { demoOnly } from '@/lib/call';
import { radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const FACTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'heart', title: 'What SafeGate is', text: 'A place to talk, calm down and get help between sessions with your therapist.' },
  { icon: 'cpu', title: 'Who you talk to', text: 'The AI companion is a computer program, not a person.' },
  {
    icon: 'eye',
    title: 'Who can read it',
    text: 'Your grown-up can read what you write here. If you might not be safe, a grown-up who looks after you will be told.',
  },
];

export default function About() {
  const { c } = useTheme();
  const fromParent = useLocalSearchParams<{ from?: string }>().from === 'parent';

  return (
    <Screen
      backdrop={fromParent ? 'brand' : 'soft'}
      header={<Header title="About SafeGate" getHelp={!fromParent} fallback={fromParent ? '/parent/account' : '/you'} />}
    >
      <Appear>
        <View style={{ backgroundColor: c.bg, borderRadius: radius.panel, overflow: 'hidden', ...shadow.lift }}>
          <FaceCollage height={140} />
          <View style={{ alignItems: 'center', gap: space.xs, padding: space.lg }}>
            <Wordmark size={34} />
            <T v="bodySm" color="textMuted">
              Version 0.1
            </T>
          </View>
        </View>
      </Appear>

      <EmergencyNote callButton />

      <Stagger>
        {FACTS.map((f) => (
          <Card key={f.title} tone="raised" padding={space.lg}>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={f.icon} size={20} color={c.brand} />
              </View>
              <View style={{ flex: 1, gap: space.xs }}>
                <T v="section" header>
                  {f.title}
                </T>
                <T v="body" color="textSecondary">
                  {f.text}
                </T>
              </View>
            </View>
          </Card>
        ))}
      </Stagger>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.xl }}>
        <Button title="Privacy" variant="text" onPress={() => demoOnly('In the real app this would open the privacy policy.')} />
        <Button title="Terms" variant="text" onPress={() => demoOnly('In the real app this would open the terms of use.')} />
      </View>
    </Screen>
  );
}
