/**
 * C18 Journal. A navy "Today's idea" panel with a character peeking in, topic tiles (character + "N IDEAS"), and
 * the "Your grown-up can read what you write here." line. Soft background.
 */
import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { Image, View } from 'react-native';
import { Header } from '@/components/Header';
import { TileRows } from '@/components/Options';
import { Screen } from '@/components/Screen';
import { Appear, Stagger } from '@/components/ui/Appear';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { FACES } from '@/data/faces';
import { JOURNAL_TOPICS, TODAYS_IDEAS } from '@/data/journal';
import { artTints, radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Journal() {
  const { c } = useTheme();
  const [idea, setIdea] = useState(0);
  const prompt = TODAYS_IDEAS[idea];

  return (
    <Screen header={<Header title="Journal" fallback="/home" />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="eye" size={18} color={c.textMuted} />
        <T v="bodySm" color="textMuted" style={{ flex: 1 }}>
          Your grown-up can read what you write here.
        </T>
      </View>

      {/* Today's idea — navy panel */}
      <Appear>
        <View style={{ backgroundColor: c.brand, borderRadius: radius.panel, padding: space.xl, overflow: 'hidden', gap: space.lg }}>
          <Image
            source={FACES.smilePillPink}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ position: 'absolute', right: -16, top: -12, width: 96, height: 128, transform: [{ rotate: '12deg' }] }}
          />
          <View style={{ gap: space.xs, paddingRight: 64 }}>
            <T v="caption" color="onBrand" style={{ opacity: 0.85 }}>
              TODAY'S IDEA
            </T>
            <T v="title" color="onBrand" accessibilityLiveRegion="polite">
              {prompt}
            </T>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Button
              title="Start writing"
              size="small"
              variant="soft"
              icon="edit-2"
              onPress={() => router.push(`/journal-write?prompt=${encodeURIComponent(prompt)}` as Href)}
            />
            <Button title="New idea" size="small" variant="onBrand" iconLeft="refresh-cw" onPress={() => setIdea((i) => (i + 1) % TODAYS_IDEAS.length)} />
          </View>
        </View>
      </Appear>

      <View style={{ gap: space.md }}>
        <T v="section" header>
          Explore
        </T>
        <Stagger>
          <TileRows>
            {JOURNAL_TOPICS.map((t) => (
              <Tappable
                key={t.id}
                label={`${t.title}. ${t.prompts.length} ideas`}
                onPress={() => router.push(`/journal-topic?id=${t.id}` as Href)}
                style={{ flex: 1, minHeight: 140, backgroundColor: c.bg, borderRadius: radius.card, padding: space.md, gap: space.sm, ...shadow.lift }}
              >
                <View style={{ width: 56, height: 56, borderRadius: radius.pill, backgroundColor: artTints[t.art.tint], alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={FACES[t.art.face]} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" style={{ width: 40, height: 40 }} />
                </View>
                <T v="bodyLg">{t.title}</T>
                <Badge label={`${t.prompts.length} IDEAS`} />
              </Tappable>
            ))}
          </TileRows>
        </Stagger>
      </View>
    </Screen>
  );
}
