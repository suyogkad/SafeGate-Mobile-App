/**
 * P17 <child>'s chats. Day | Week | Month, then a card per day of real conversation.
 *
 * The child's app tells them plainly that their grown-up can read these (rule 3), and the
 * product depends on that being true — so this reads the real conversation log, and the
 * banner at the top says it again to the parent.
 *
 * A day where the app switched to calm steps is marked, because that is the day a parent
 * most needs to find. The concern level stays on the parent's side only (rule 5).
 */
import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { CheckinCard } from '@/components/CheckinCard';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { FaceCircle } from '@/components/ui/bits';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { useChildChats, useMyChild } from '@/lib/family';
import { addDays, localDateIso, todayIso } from '@/lib/schedule';
import { clockOf } from '@/lib/time';
import { artTints, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const RANGES = ['Day', 'Week', 'Month'] as const;
const DAY = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

export default function Chats() {
  const { c } = useTheme();
  const child = useMyChild();
  const name = child?.full_name || 'your child';
  const { turns, loading } = useChildChats(child?.id);
  const [range, setRange] = useState<(typeof RANGES)[number]>('Week');

  const today = todayIso();
  const from = range === 'Day' ? today : range === 'Week' ? addDays(today, -6) : addDays(today, -29);

  // One card per day, newest first.
  const byDay = new Map<string, typeof turns>();
  for (const t of turns) {
    const day = localDateIso(new Date(t.timestamp));
    if (day < from) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), t]);
  }
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <Screen backdrop="brand" header={<Header title={`${name}'s chats`} getHelp={false} fallback="/parent/home" />}>
      <Card tone="tint" padding={space.md}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="eye" size={18} color={c.brand} />
          <T v="bodySm" color="brand" style={{ flex: 1 }}>
            {name} knows you can read these.
          </T>
        </View>
      </Card>

      <Segmented label="Show chats from" options={RANGES} value={range} onChange={setRange} />

      {days.length === 0 ? (
        <Card tone="raised" r={24} padding={space.xl}>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <FaceCircle face={FACES.monocleWave} tint={artTints.blue} size={80} />
            <T v="bodyLg" color="textSecondary" center>
              {loading
                ? 'Loading…'
                : range === 'Day'
                  ? `Nothing from ${name} today yet.`
                  : `No chats from ${name} in this time.`}
            </T>
          </View>
        </Card>
      ) : (
        <Stagger>
          {days.map(([day, items]) => {
            const calm = items.some((t) => t.flagged);
            const first = items[0];
            const last = items[items.length - 1];
            return (
              <View key={day} style={{ gap: space.md }}>
                <T v="section" header>
                  {day === today ? 'Today' : DAY.format(new Date(`${day}T12:00:00`))}
                </T>
                <CheckinCard
                  caption={`${calm ? 'CALM STEPS' : 'TALK'} · ${clockOf(first.timestamp)}–${clockOf(last.timestamp)}`}
                  title={
                    calm
                      ? 'The app switched to calm steps this day.'
                      : items.length === 1
                        ? 'One chat with the AI companion'
                        : `${items.length} chats with the AI companion`
                  }
                  right={
                    <FaceCircle
                      face={calm ? FACES.calmHexagon : FACES.monocleWave}
                      tint={calm ? artTints.cyan : artTints.blue}
                      size={64}
                    />
                  }
                  onPress={() => router.push(`/parent/transcript?day=${day}` as Href)}
                  a11yLabel={`${calm ? 'Calm steps' : 'Chats'}, ${day === today ? 'today' : DAY.format(new Date(`${day}T12:00:00`))}. Open`}
                />
              </View>
            );
          })}
        </Stagger>
      )}
    </Screen>
  );
}
