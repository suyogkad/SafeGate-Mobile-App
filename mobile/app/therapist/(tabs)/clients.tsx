/**
 * T05 Clients (tab root). Built like Find a therapist: a search field, filter chips (All · Session this week ·
 * Needs attention) and a raised card per child: the initial with the child's character, name, age band and parent,
 * the next session, the last check-in the family shared (the mood word, never a score) and tags.
 * Only Alex is live; Mia and Leo are static so the list reads like a real caseload.
 */
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Avatar } from '@/components/ui/bits';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { CLIENTS } from '@/data/practice';
import { useClients, type ClientSummary } from '@/lib/clients';
import { addDays, DEMO_TODAY, weekStart } from '@/lib/schedule';
import { useBookings } from '@/store/app';
import { gutter, radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const FILTERS = ['All', 'Session this week', 'Needs attention'] as const;

function ClientCard({ cl }: { cl: ClientSummary }) {
  const { c } = useTheme();
  const art = CLIENTS[cl.id];
  // spoken in plain words: screen readers can spell out capitals letter by letter
  const tags = [cl.needsAttention ? 'Needs attention' : null, cl.sharedThisWeek ? 'Shared this week' : null].filter(Boolean) as string[];
  return (
    <Tappable
      label={[cl.name, `${cl.age}, with ${cl.parent}`, cl.next ? `Next session ${cl.next}` : 'No session booked', cl.lastCheckin ? `Last check-in ${cl.lastCheckin}` : 'Nothing shared this week', ...tags, 'Open']
        .join('. ')}
      onPress={() => router.push(`/therapist/client?id=${cl.id}` as Href)}
      style={{ backgroundColor: c.bg, borderRadius: radius.panel, padding: space.lg, ...shadow.lift }}
    >
      <View style={{ flexDirection: 'row', gap: space.lg }}>
        <View>
          <Avatar initials={cl.name.charAt(0)} size={64} />
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
          <T v="heading">{cl.name}</T>
          <T v="bodySm" color="textSecondary">
            {cl.age} · with {cl.parent}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs }}>
            <Icon name="calendar" size={16} color={c.textSecondary} />
            <T v="bodySm">{cl.next ?? 'No session booked'}</T>
          </View>
          <T v="bodySm" color="textMuted">
            {cl.lastCheckin ? `Last check-in: ${cl.lastCheckin}` : 'Nothing shared this week'}
          </T>
          {tags.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs }}>
              {cl.needsAttention ? <Badge label="NEEDS ATTENTION" tone="warn" /> : null}
              {cl.sharedThisWeek ? <Badge label="SHARED THIS WEEK" tone="success" /> : null}
            </View>
          ) : null}
        </View>
        <Icon name="chevron-right" size={20} color={c.textMuted} />
      </View>
    </Tappable>
  );
}

export default function Clients() {
  const { c } = useTheme();
  const clients = useClients();
  const bookings = useBookings();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [query, setQuery] = useState('');

  const monday = weekStart(addDays(DEMO_TODAY, 1));
  const thisWeek = (id: string) => bookings.some((b) => b.clientId === id && b.date >= monday && b.date <= addDays(monday, 6));
  const q = query.trim().toLowerCase();
  const list = clients
    .filter((cl) => !q || cl.name.toLowerCase().includes(q) || cl.parent.toLowerCase().includes(q))
    .filter((cl) => (filter === 'Session this week' ? thisWeek(cl.id) : filter === 'Needs attention' ? cl.needsAttention : true));

  return (
    <Screen inTabs backdrop="brand" header={<Header title="Clients" getHelp={false} fallback="/therapist/today" />}>
      <Input a11yLabel="Search clients" placeholder="Search clients" value={query} onChangeText={setQuery} leftIcon="search" autoCapitalize="none" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: gutter }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f} selected={f === filter} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>
      {list.length ? (
        <View style={{ gap: space.md }}>
          <Stagger key={filter + q}>
            {list.map((cl) => (
              <ClientCard key={cl.id} cl={cl} />
            ))}
          </Stagger>
        </View>
      ) : (
        <Card tone="raised" r={24} padding={space.xl}>
          <View style={{ alignItems: 'center', gap: space.md }} accessibilityLiveRegion="polite">
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="users" size={28} color={c.brand} />
            </View>
            <T v="heading" center>
              No clients here right now
            </T>
            <T v="body" color="textSecondary" center>
              Try another filter, or see everyone.
            </T>
            <Chip
              label="See everyone"
              onPress={() => {
                setFilter('All');
                setQuery('');
              }}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}
