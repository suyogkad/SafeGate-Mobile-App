/**
 * C16 Calm activity. An ActivityBand hero, "Good for when…" rows, four "What you'll do" tiles (the last is always
 * Read to me), and a sticky Start.
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { View } from 'react-native';
import { ActivityBand } from '@/components/ActivityBand';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { TileRows } from '@/components/Options';
import { Appear, Stagger } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { calmActivity } from '@/data/calm';
import { radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function CalmActivityScreen() {
  const { c } = useTheme();
  const a = calmActivity(useLocalSearchParams<{ id?: string }>().id ?? 'feet');

  return (
    <Screen
      header={<Header title={a.title} fallback="/calm" />}
      footer={<Button title="Start" icon="arrow-right" onPress={() => router.push(`/calm-steps?id=${a.id}` as Href)} />}
    >
      <T v="bodyLg" color="textSecondary">
        Short steps to feel steady.
      </T>

      <Appear>
        <View style={{ backgroundColor: c.bg, borderRadius: radius.panel, ...shadow.lift }}>
          <ActivityBand activity={a} height={150} />
          <View style={{ padding: space.lg, gap: space.xs }}>
            <T v="title" header>
              {a.title}
            </T>
            <T v="body" color="textSecondary">
              {a.description}
            </T>
          </View>
        </View>
      </Appear>

      <View style={{ gap: space.md }}>
        <T v="section" header>
          Good for when…
        </T>
        <Card tone="raised" padding={space.lg}>
          <View style={{ gap: space.md }}>
            {a.goodFor.map((g) => (
              <View key={g.text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                  <T v="heading" allowFontScaling={false} style={{ fontSize: 20, lineHeight: 26 }}>
                    {g.emoji}
                  </T>
                </View>
                <T v="bodyLg" style={{ flex: 1 }}>
                  {g.text}
                </T>
              </View>
            ))}
          </View>
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <T v="section" header>
          What you'll do
        </T>
        <TileRows>
          {a.youllDo.map((d) => (
            <View key={d.title} style={{ flex: 1, backgroundColor: c.bg, borderRadius: radius.card, padding: space.md, gap: space.sm, minHeight: 112, ...shadow.lift }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={d.icon as IconName} size={20} color={c.brand} />
              </View>
              <T v="bodySmMedium">{d.title}</T>
              <T v="caption" color="textMuted">
                {d.line}
              </T>
            </View>
          ))}
        </TileRows>
      </View>
    </Screen>
  );
}
