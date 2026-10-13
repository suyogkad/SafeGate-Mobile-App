/**
 * P10 Find a therapist. A hero, filter chips by what each one does, and a card per
 * therapist: initials + a character (no photos), name, the line they wrote for their
 * card, and when they are next free. No star ratings, no prices.
 *
 * Everything here is real. The backend lists only therapists an admin has approved,
 * and "next free" is one of their actual open times, so a family is never shown a
 * time that is not really there. The filter chips are built from what the listed
 * therapists actually do, rather than a fixed list that could offer an empty filter.
 */
import { useEffect, useState } from 'react';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, ScrollView, View } from 'react-native';
import { goBack } from '@/components/Header';
import { HeroBand } from '@/components/HeroBand';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Avatar, FaceCircle } from '@/components/ui/bits';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { listOpenTimes, type ApiTherapistPublic } from '@/api/family';
import { FACES } from '@/data/faces';
import { characterFor } from '@/lib/character';
import { useMyChild, useTherapistDirectory } from '@/lib/family';
import { artTints, gutter, radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const FREE = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** When each listed therapist is next free, from their real open times. */
function useNextFreeTimes(therapists: ApiTherapistPublic[]) {
  const [next, setNext] = useState<Record<string, string | null>>({});
  const ids = therapists.map((t) => t.id).join(',');

  useEffect(() => {
    if (!ids) return;
    let alive = true;
    Promise.all(
      ids.split(',').map(async (id) => {
        try {
          const slots = await listOpenTimes(id);
          const soonest = slots
            .filter((s) => !s.is_booked)
            .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
          return [id, soonest ? FREE.format(new Date(soonest.start_time)).toUpperCase() : null] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((pairs) => alive && setNext(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [ids]);

  return next;
}

function TherapistRow({ t, nextFree }: { t: ApiTherapistPublic; nextFree: string | null | undefined }) {
  const { c } = useTheme();
  const art = characterFor(t.id);
  const initials =
    t.full_name
      .replace(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Mx\.?)\s+/i, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';
  // Until they have written their card line, say what they do rather than nothing.
  const line = t.blurb || [t.title, t.clinic ? `Video or ${t.clinic.name}` : 'Video'].filter(Boolean).join(' · ');
  const badge = nextFree === undefined ? 'CHECKING TIMES' : nextFree ? `NEXT FREE: ${nextFree}` : 'NO FREE TIMES YET';

  return (
    <Tappable
      label={`${t.full_name}. ${line}. ${nextFree ? `Next free ${nextFree}` : 'No free times yet'}. Open profile`}
      onPress={() => router.push(`/parent/therapist?id=${t.id}` as Href)}
      style={{ backgroundColor: c.bg, borderRadius: radius.panel, padding: space.lg, ...shadow.lift }}
    >
      <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
        <View>
          <Avatar initials={initials} size={64} />
          <View
            style={{
              position: 'absolute',
              right: -8,
              bottom: -6,
              width: 32,
              height: 32,
              borderRadius: radius.pill,
              backgroundColor: art.tint,
              borderWidth: 2,
              borderColor: c.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image source={art.face} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" style={{ width: 20, height: 20 }} />
          </View>
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <Badge label={badge} tone={nextFree ? 'success' : 'neutral'} />
          <T v="section">{t.full_name}</T>
          <T v="bodySm" color="textSecondary">
            {line}
          </T>
        </View>
        <Icon name="chevron-right" size={20} color={c.textMuted} />
      </View>
    </Tappable>
  );
}

export default function FindTherapist() {
  const child = useMyChild();
  const name = child?.full_name || 'your child';
  const { therapists, loading } = useTherapistDirectory();
  const nextFree = useNextFreeTimes(therapists);
  const [filter, setFilter] = useState('All');

  // Only offer a filter somebody on the list actually matches.
  const kinds = [...new Set(therapists.map((t) => t.title).filter(Boolean))].sort();
  const filters = ['All', ...kinds];
  const list = therapists.filter((t) => filter === 'All' || t.title === filter);

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
        {filters.length > 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: gutter }}>
            {filters.map((f) => (
              <Chip key={f} label={f} selected={f === filter} onPress={() => setFilter(f)} />
            ))}
          </ScrollView>
        ) : null}

        {list.length === 0 ? (
          <Card tone="raised" r={24} padding={space.xl}>
            <View style={{ alignItems: 'center', gap: space.md }} accessibilityLiveRegion="polite">
              <FaceCircle face={FACES.monocleWave} tint={artTints.blue} size={80} />
              <T v="heading" center>
                {loading ? 'Looking for therapists…' : filter === 'All' ? 'No therapists yet' : `No ${filter.toLowerCase()}s yet`}
              </T>
              <T v="body" color="textSecondary" center>
                {loading
                  ? ' '
                  : filter === 'All'
                    ? 'Therapists appear here once SafeGate has checked their registration.'
                    : 'Try another kind of therapist, or see everyone.'}
              </T>
              {!loading && filter !== 'All' ? <Chip label="See everyone" onPress={() => setFilter('All')} /> : null}
            </View>
          </Card>
        ) : (
          <View style={{ gap: space.md }}>
            <T v="section" header>
              {filter === 'All' ? 'Therapists near you' : `${filter}s`}
            </T>
            <Stagger key={filter}>
              {list.map((t) => (
                <TherapistRow key={t.id} t={t} nextFree={nextFree[t.id]} />
              ))}
            </Stagger>
          </View>
        )}
      </View>
    </Screen>
  );
}
