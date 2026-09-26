/**
 * C29 Error. One centred card with a gentle icon in a blue circle (never a warning triangle), a title, a line,
 * and Try again / Calm me / Get help. No red, no "Oops", no error code. Get help stays in the header.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { goBack, Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const COPY = {
  notSent: { icon: 'cloud-off', title: "Your message wasn't sent", body: 'You can try again, or do something else for now.' },
  blocked: {
    icon: 'eye-off',
    title: "Something didn't come through",
    body: "I couldn't show that safely, so I didn't show it at all. You can try again.",
  },
} as const;

export default function TalkError() {
  const { c } = useTheme();
  const kind = useLocalSearchParams<{ kind?: string }>().kind === 'blocked' ? 'blocked' : 'notSent';
  const copy = COPY[kind];

  return (
    <Screen
      header={<Header fallback="/talk" />}
      footer={
        <View style={{ gap: space.sm }}>
          <Button title="Try again" icon="rotate-ccw" onPress={() => goBack('/talk')} />
          <Button title="Calm me" variant="outline" onPress={() => router.push('/calm')} />
          <Button title="Get help" variant="outline" onPress={() => router.push('/get-help')} />
        </View>
      }
      contentStyle={{ flexGrow: 1, justifyContent: 'center' }}
    >
      <Card padding={space.xl}>
        <View style={{ alignItems: 'center', gap: space.lg }} accessibilityLiveRegion="polite">
          <View style={{ width: 72, height: 72, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={copy.icon} size={32} color={c.brand} />
          </View>
          <T v="title" center header>
            {copy.title}
          </T>
          <T v="body" color="textSecondary" center>
            {copy.body}
          </T>
        </View>
      </Card>
    </Screen>
  );
}
