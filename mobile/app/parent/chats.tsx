/**
 * P17 Alex's chats. Segmented Day | Week | Month and a list of chat cards (caption, title, character circle) on the
 * brand background with staggered entrances.
 * "Today" is live from this session (Talk, calm mode, journal); then the demo history by day. Each opens P18.
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
import { KIND_ART, KIND_TAG, TRANSCRIPTS, type Transcript } from '@/data/transcripts';
import { useApp, useChildName } from '@/store/app';
import { artTints, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const RANGES = ['Day', 'Week', 'Month'] as const;

export default function Chats() {
  const { c } = useTheme();
  const name = useChildName();
  const [range, setRange] = useState<(typeof RANGES)[number]>('Week');
  const messages = useApp((s) => s.messages);
  const journal = useApp((s) => s.journal);
  const calmMode = useApp((s) => s.calmMode);
  const calmAt = useApp((s) => s.calmAt);
  const hasLive = messages.length > 0 || journal.length > 0 || calmMode !== 'off';

  // Demo history, grouped by day in order. "Day" shows only today.
  const days: { day: string; items: Transcript[] }[] = [];
  if (range !== 'Day') {
    TRANSCRIPTS.forEach((t) => {
      const g = days.find((d) => d.day === t.day);
      if (g) g.items.push(t);
      else days.push({ day: t.day, items: [t] });
    });
  }

  const card = (t: Transcript) => {
    const art = KIND_ART[t.kind];
    return (
      <CheckinCard
        key={t.id}
        caption={`${KIND_TAG[t.kind]} · ${t.time}`}
        title={t.opener}
        right={<FaceCircle face={FACES[art.face]} tint={artTints[art.tint]} size={64} />}
        onPress={() => router.push(`/parent/transcript?id=${t.id}` as Href)}
        a11yLabel={`${KIND_TAG[t.kind]}, ${t.day}, ${t.time}. ${t.opener}. Open`}
      />
    );
  };

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

      <Stagger>
        {hasLive ? (
          <View style={{ gap: space.md }}>
            <T v="section" header>
              Today
            </T>
            <CheckinCard
              caption={`${calmMode !== 'off' ? 'CALM STEPS' : messages.length ? 'TALK' : 'JOURNAL'} · ${calmMode !== 'off' ? calmAt : 'today'}`}
              title={calmMode !== 'off' ? 'The app switched to calm steps.' : `${name}'s chats from today`}
              right={
                <FaceCircle
                  face={calmMode !== 'off' ? FACES.calmHexagon : FACES.monocleWave}
                  tint={calmMode !== 'off' ? artTints.cyan : artTints.blue}
                  size={64}
                />
              }
              onPress={() => router.push('/parent/transcript?id=live')}
            />
          </View>
        ) : range === 'Day' ? (
          <Card tone="raised" padding={space.lg}>
            <T v="bodyLg" color="textSecondary">
              Nothing yet today.
            </T>
          </Card>
        ) : null}
        {days.map((d) => (
          <View key={d.day} style={{ gap: space.md }}>
            <T v="section" header>
              {d.day}
            </T>
            {d.items.map(card)}
          </View>
        ))}
      </Stagger>
    </Screen>
  );
}
