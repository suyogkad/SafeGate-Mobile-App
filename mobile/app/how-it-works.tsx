/**
 * C05 How this works. Three plain facts in cards with icons, the emergency note, and "I understand".
 * First time (after linking): no back and no close, only Get help. It can't be skipped.
 * Opened again from You → More (?again=1): back arrow, no "I understand".
 * Never calls the app "private" or "secret".
 */
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { EmergencyNote } from '@/components/EmergencyNote';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const LINES: { icon: IconName; text: string }[] = [
  { icon: 'book-open', text: 'Your grown-up can read what you write here. They look after you.' },
  { icon: 'users', text: 'If you say something that means you might not be safe, a grown-up who looks after you will be told, so they can help.' },
  { icon: 'message-circle', text: 'Some things are easier to say to a person. You can tell your therapist in your session.' },
];

export default function HowItWorks() {
  const { c } = useTheme();
  const again = useLocalSearchParams<{ again?: string }>().again === '1';

  return (
    <Screen
      header={<Header left={again ? 'back' : 'none'} fallback="/you" />}
      footer={again ? undefined : <Button title="I understand" onPress={() => router.replace('/home')} />}
    >
      <T v="title" header>
        How this works
      </T>

      <View style={{ gap: space.md }}>
        {LINES.map((l, i) => (
          <Appear key={l.icon} delay={i * 60}>
            <Card padding={space.lg}>
              <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' }}>
                <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={l.icon} size={24} color={c.brand} />
                </View>
                <T v="bodyLg" style={{ flex: 1 }}>
                  {l.text}
                </T>
              </View>
            </Card>
          </Appear>
        ))}
      </View>

      <EmergencyNote />
    </Screen>
  );
}
