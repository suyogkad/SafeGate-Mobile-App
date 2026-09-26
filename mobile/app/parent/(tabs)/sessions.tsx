/**
 * P13 Sessions (tab root). A navy "Next session" summary, then session cards (initials, date, kind badge) under a
 * segmented Upcoming | Past. The booked session comes from the store (Book changes it everywhere). Past sessions
 * show whether the therapist has shared notes yet (NOTES COMING → NOTES SHARED, live from Write notes).
 */
import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { Image, View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear, Stagger } from '@/components/ui/Appear';
import { Avatar } from '@/components/ui/bits';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { FACES } from '@/data/faces';
import { ALEX_PAST } from '@/data/practice';
import { LATER_SESSION } from '@/data/sessions';
import { dayLabel, timeLabel } from '@/lib/schedule';
import { useApp } from '@/store/app';
import { radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const TABS = ['Upcoming', 'Past'] as const;

/** "Thursday 15 October" → "Thursday, 15 October" */
const withComma = (d: string) => d.replace(/^(\w+) /, '$1, ');

type Row = { key: string; date: string; tag: string; tone: BadgeTone; time: string; title: string; line: string; href?: Href; initials: string };

export default function Sessions() {
  const { c } = useTheme();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Upcoming');
  const s = useApp((st) => st.session);
  const notes = useApp((st) => st.sessionNotes);
  const initials = s.therapist
    .split(' ')
    .map((w) => w[0])
    .join('');

  const upcoming: Row[] = [
    {
      key: 'booked',
      date: withComma(s.dateLabel),
      tag: s.kind.toUpperCase(),
      tone: 'info',
      time: s.time,
      title: `With ${s.therapist}, ${s.role}`,
      line: s.kind === 'Video call' ? `The join link opens at ${s.joinOpens}.` : s.place ?? '',
      initials,
    },
    { key: 'later', date: LATER_SESSION.dateLabel, tag: LATER_SESSION.kind, tone: 'info', time: LATER_SESSION.time, title: LATER_SESSION.with, line: LATER_SESSION.place, initials: 'PS' },
  ];
  // Past sessions follow the therapist's notes: NOTES COMING until Priya shares them, then NOTES SHARED → P14.
  const past: Row[] = ALEX_PAST.map((p) => {
    const n = notes[p.id];
    const shared = !!n?.sharedAt;
    return {
      key: p.id,
      date: withComma(dayLabel(p.date)),
      tag: shared ? 'NOTES SHARED' : 'NOTES COMING',
      tone: shared ? 'success' : 'neutral',
      time: timeLabel(p.start),
      title: shared ? `Notes from ${s.therapistFirst}` : `${p.kind} with ${s.therapist}`,
      line: shared ? `“${n!.highlights[0]?.text ?? n!.shared.split('. ')[0]}”` : `${s.therapistFirst} will share notes here.`,
      href: `/parent/session-notes?id=${p.id}` as Href,
      initials: 'PS',
    };
  });
  const rows = tab === 'Upcoming' ? upcoming : past;

  return (
    <Screen inTabs backdrop="brand" header={<Header title="Sessions" left="none" getHelp={false} />}>
      {/* Next session — navy panel */}
      <Appear>
        <View style={{ backgroundColor: c.brand, borderRadius: radius.panel, padding: space.xl, overflow: 'hidden', gap: space.md }}>
          <Image
            source={FACES.smileFlower}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ position: 'absolute', right: -20, bottom: -24, width: 120, height: 120, transform: [{ rotate: '-8deg' }] }}
          />
          <T v="caption" color="onBrand" style={{ opacity: 0.85 }}>
            NEXT SESSION
          </T>
          <View style={{ gap: 2, paddingRight: 80 }}>
            <T v="title" color="onBrand">
              {s.short.split(' ').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ')} · {s.time}
            </T>
            <T v="bodyLg" color="onBrand" style={{ opacity: 0.9 }}>
              {s.therapist} · {s.kind}
            </T>
          </View>
          <Button title="Book another" size="small" variant="onBrand" iconLeft="plus" onPress={() => router.push('/parent/find-therapist')} />
        </View>
      </Appear>

      <Segmented label="Sessions" options={TABS} value={tab} onChange={setTab} />

      <View style={{ gap: space.md }} key={tab}>
        <Stagger>
          {rows.map((r) => {
            const body = (
              <View style={{ flexDirection: 'row', gap: space.lg }}>
                <Avatar initials={r.initials} size={52} />
                <View style={{ flex: 1, gap: space.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                    <Badge label={r.tag} tone={r.tone} />
                    <T v="caption" color="textMuted">
                      {r.time}
                    </T>
                  </View>
                  <T v="section">{r.date}</T>
                  <T v="bodySm" color="textSecondary">
                    {r.title}
                  </T>
                  <T v="bodySm" color="textMuted">
                    {r.line}
                  </T>
                </View>
                {r.href ? <Icon name="chevron-right" size={20} color={c.textMuted} /> : null}
              </View>
            );
            const style = { backgroundColor: c.bg, borderRadius: radius.panel, padding: space.lg, ...shadow.lift };
            return r.href ? (
              <Tappable key={r.key} label={`${r.date}, ${r.time}. ${r.title}. Open notes`} onPress={() => router.push(r.href!)} style={style}>
                {body}
              </Tappable>
            ) : (
              <View key={r.key} style={style}>
                {body}
              </View>
            );
          })}
        </Stagger>
      </View>
    </Screen>
  );
}
