/**
 * C07 Explore (tab root). Everything the child can do, grouped by need: a hero, a search that filters every tile by
 * label and keywords, quick-search chips, "Based on how you feel" rows, and tile groups (Ask your AI companion,
 * Calm your body, Write and check in). Compact Get help on the hero.
 */
import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, ScrollView, View } from 'react-native';
import { CheckinCard } from '@/components/CheckinCard';
import { GetHelpButton } from '@/components/GetHelpButton';
import { HeroBand } from '@/components/HeroBand';
import { TileRows } from '@/components/Options';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { FaceCircle } from '@/components/ui/bits';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { EXPLORE_SECTIONS, QUICK_SEARCHES, matchesSearch, type ExploreItem } from '@/data/explore';
import { FACES } from '@/data/faces';
import { artTints, gutter, radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Explore() {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const sections = EXPLORE_SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => matchesSearch(i, q)) })).filter((s) => s.items.length);

  return (
    <Screen inTabs padded={false} edgeToEdge>
      <StatusBar style="dark" />
      <HeroBand art="explore" topRight={<GetHelpButton compact onBrand />}>
        <View style={{ gap: space.sm }}>
          <T v="heading" header>
            Explore
          </T>
          <T v="bodyLg">Things that can help, any time.</T>
        </View>
      </HeroBand>

      <View style={{ paddingHorizontal: gutter, gap: space.xl }}>
        <View style={{ gap: space.md }}>
          <View>
            <Input
              a11yLabel="Search by feeling or thing"
              placeholder="Search by feeling or thing"
              value={q}
              onChangeText={setQ}
              leftIcon="search"
              icon={q ? 'x' : undefined}
              iconLabel="Clear search"
              onIconPress={() => setQ('')}
              returnKeyType="search"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: gutter }}>
            {QUICK_SEARCHES.map((s) => (
              <Chip key={s} label={s} selected={q.toLowerCase() === s.toLowerCase()} onPress={() => setQ((cur) => (cur.toLowerCase() === s.toLowerCase() ? '' : s))} />
            ))}
          </ScrollView>
        </View>

        {sections.length === 0 ? (
          <Card tone="raised" r={24} padding={space.xl}>
            <View style={{ alignItems: 'center', gap: space.md }} accessibilityLiveRegion="polite">
              <FaceCircle face={FACES.monocleWave} tint={artTints.blue} size={80} />
              <T v="bodyLg" color="textSecondary" center>
                Nothing found for “{q}”. Try another word, or just chat.
              </T>
            </View>
          </Card>
        ) : (
          <Stagger key={q}>
            {sections.map((s) => (
              <View key={s.title} style={{ gap: space.md }}>
                <T v="section" header>
                  {s.title}
                </T>
                {s.kind === 'rows' ? (
                  <View style={{ gap: space.md }}>
                    {s.items.map((i) => (
                      <CheckinCard
                        key={i.id}
                        caption={i.tag ?? ''}
                        title={i.label}
                        right={<FaceCircle face={FACES[i.face!]} tint={artTints[i.tint]} size={64} />}
                        onPress={() => router.push(i.href as Href)}
                      />
                    ))}
                  </View>
                ) : (
                  <TileRows>
                    {s.items.map((i) => (
                      <ExploreTile key={i.id} item={i} />
                    ))}
                  </TileRows>
                )}
              </View>
            ))}
          </Stagger>
        )}
      </View>
    </Screen>
  );
}

/** Explore tile: white, a character (or icon) in a tinted circle, label. */
function ExploreTile({ item }: { item: ExploreItem }) {
  const { c } = useTheme();
  return (
    <Tappable
      label={item.label}
      onPress={() => router.push(item.href as Href)}
      style={{ flex: 1, minHeight: 120, backgroundColor: c.bg, borderRadius: radius.card, padding: space.md, gap: space.md, ...shadow.lift }}
    >
      <View style={{ width: 52, height: 52, borderRadius: radius.pill, backgroundColor: artTints[item.tint], alignItems: 'center', justifyContent: 'center' }}>
        {item.face ? (
          <Image source={FACES[item.face]} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" style={{ width: 36, height: 36 }} />
        ) : (
          <Icon name={item.icon as IconName} size={22} color={c.brand} />
        )}
      </View>
      <T v="bodySmMedium">{item.label}</T>
    </Tappable>
  );
}
