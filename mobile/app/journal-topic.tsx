/**
 * C19 Journal topic. A full-width band in the topic's tint (character, small "JOURNAL" label, big topic title),
 * then the topic's prompts as rows with a tag and chevron in a raised card.
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { journalTopic } from '@/data/journal';
import { artTints, gutter, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function JournalTopic() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const topic = journalTopic(useLocalSearchParams<{ id?: string }>().id ?? '');

  return (
    <Screen edgeToEdge padded={false}>
      <View
        style={{
          backgroundColor: artTints[topic.art.tint],
          paddingTop: insets.top,
          paddingBottom: space.xl,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <Header fallback="/journal" />
        <View style={{ paddingHorizontal: gutter, flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <View style={{ flex: 1, gap: space.xs }}>
            <T v="caption" color="textSecondary">
              JOURNAL
            </T>
            <T v="title" header>
              {topic.title}
            </T>
            <T v="bodySm" color="textSecondary">
              {topic.prompts.length} ideas to write about
            </T>
          </View>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width: 96, height: 96, borderRadius: radius.pill, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 4px 16px rgba(20,20,20,0.08)' }}
          >
            <Image source={FACES[topic.art.face]} resizeMode="contain" style={{ width: 66, height: 66 }} />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: gutter }}>
        <Card tone="raised" r={24} padding={space.lg} style={{ paddingVertical: space.xs }}>
          <Stagger>
            {topic.prompts.map((p, i) => (
              <ListRow
                key={p.text}
                title={p.text}
                tag={p.tag.toUpperCase()}
                chevron
                divider={i < topic.prompts.length - 1}
                onPress={() => router.push(`/journal-write?prompt=${encodeURIComponent(p.text)}` as Href)}
              />
            ))}
          </Stagger>
        </Card>
      </View>
    </Screen>
  );
}
