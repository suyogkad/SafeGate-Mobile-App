/**
 * P10 Find a therapist. A hero, filter chips (All · Psychologist · Occupational therapist · Speech pathologist ·
 * Counsellor, which has an empty state), and a card per therapist: initials + a character (no photos), name, blurb,
 * "NEXT FREE" badge (Priya's is live from her hours). No star ratings, no prices.
 */
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import { goBack } from '@/components/Header';
import { HeroBand } from '@/components/HeroBand';
import { TherapistCard } from '@/components/TherapistCard';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { FaceCircle } from '@/components/ui/bits';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { THERAPIST_FILTERS } from '@/data/therapists';
import { useChildName, useTherapists } from '@/store/app';
import { artTints, gutter, space } from '@/theme/tokens';

export default function FindTherapist() {
  const name = useChildName();
  const [filter, setFilter] = useState<(typeof THERAPIST_FILTERS)[number]>('All');
  const list = useTherapists().filter((t) => filter === 'All' || t.role === filter);

  return (
    <Screen padded={false} edgeToEdge backdrop="brand">
      <StatusBar style="dark" />
      <HeroBand art="explore" topLeft={<IconButton icon="chevron-left" label="Back" variant="soft" onPress={() => goBack('/parent/home')} />}>
        <View style={{ gap: space.sm }}>
          <T v="heading" header>
            Find a therapist
          </T>
          <T v="bodyLg">People who work with kids like {name}.</T>
        </View>
      </HeroBand>

      <View style={{ paddingHorizontal: gutter, gap: space.xl }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: gutter }}>
          {THERAPIST_FILTERS.map((f) => (
            <Chip key={f} label={f} selected={f === filter} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>

        {list.length === 0 ? (
          <Card tone="raised" r={24} padding={space.xl}>
            <View style={{ alignItems: 'center', gap: space.md }} accessibilityLiveRegion="polite">
              <FaceCircle face={FACES.monocleWave} tint={artTints.blue} size={80} />
              <T v="heading" center>
                No counsellors yet
              </T>
              <T v="body" color="textSecondary" center>
                Try another kind of therapist, or see everyone.
              </T>
              <Chip label="See everyone" onPress={() => setFilter('All')} />
            </View>
          </Card>
        ) : (
          <View style={{ gap: space.md }}>
            <T v="section" header>
              {filter === 'All' ? 'Therapists near you' : `${filter}s`}
            </T>
            <Stagger key={filter}>
              {list.map((t) => (
                <TherapistCard key={t.id} t={t} />
              ))}
            </Stagger>
          </View>
        )}
      </View>
    </Screen>
  );
}
