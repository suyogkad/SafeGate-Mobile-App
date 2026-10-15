/**
 * C23 You: Comfort settings (tab root). A "Your comfort" hero, value rows that cycle on tap, switch rows, and More
 * links. Shares ComfortSettings and the store with the parent's P07. Changes work straight away (this page restyles
 * itself as Alex toggles). No Save, no sign-out, no delete.
 */
import { router, type Href } from 'expo-router';
import { Image, View } from 'react-native';
import { ComfortSettings } from '@/components/ComfortSettings';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { useChildName } from '@/store/app';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const MORE: { title: string; icon: 'calendar' | 'info' | 'heart'; href: Href }[] = [
  { title: 'My sessions', icon: 'calendar', href: '/my-sessions' },
  { title: 'How this works', icon: 'info', href: '/how-it-works?again=1' },
  { title: 'About SafeGate', icon: 'heart', href: '/about' },
];

export default function You() {
  const { c } = useTheme();
  const name = useChildName();

  return (
    <Screen inTabs header={<Header title="Comfort settings" left="none" getHelp="compact" />}>
      <T v="bodyLg" color="textSecondary">
        Change these any time. They work straight away.
      </T>

      <Appear>
        <View style={{ backgroundColor: c.brand, borderRadius: radius.panel, padding: space.xl, overflow: 'hidden', gap: space.xs }}>
          <Image
            source={FACES.smileFlower}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ position: 'absolute', right: -22, top: -10, width: 120, height: 120, transform: [{ rotate: '10deg' }] }}
          />
          <T v="caption" color="onBrand" style={{ opacity: 0.85 }}>
            MADE FOR {name.toUpperCase()}
          </T>
          <T v="title" color="onBrand" header>
            Your comfort
          </T>
          <T v="bodyLg" color="onBrand" style={{ paddingRight: 72 }}>
            Bigger text, calm colours and a voice that reads to you.
          </T>
        </View>
      </Appear>

      <ComfortSettings />
      <Card tone="raised" padding={space.lg}>
        <T v="bodySm" color="textSecondary">
          These settings apply to this phone. They work straight away.
        </T>
      </Card>

      <View style={{ gap: space.sm }}>
        <T v="section" header>
          More
        </T>
        <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
          {MORE.map((m, i) => (
            <ListRow key={m.title} title={m.title} icon={m.icon} chevron divider={i < MORE.length - 1} onPress={() => router.push(m.href)} />
          ))}
        </Card>
      </View>
    </Screen>
  );
}
