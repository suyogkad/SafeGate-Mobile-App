/**
 * P21 Alex's journal. Stat tiles, then entry cards (caption, prompt, character) on the brand background.
 * "Today" = entries written this session (live, → transcript ?id=live); then the demo entries by day (→ P18).
 * Includes the optional richer summary (entries, words, feeling mentioned most).
 */
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { CheckinCard } from '@/components/CheckinCard';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Card } from '@/components/ui/Card';
import { FaceCircle } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { JOURNAL_STATS } from '@/data/journal';
import { TRANSCRIPTS } from '@/data/transcripts';
import { useApp, useChildName } from '@/store/app';
import { artTints, radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

function Stat({ value, label }: { value: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, borderRadius: radius.panel, padding: space.lg, gap: 2, ...shadow.lift }}>
      <T v="title" color="brand">
        {value}
      </T>
      <T v="bodySm" color="textSecondary">
        {label}
      </T>
    </View>
  );
}

export default function ParentJournal() {
  const { c } = useTheme();
  const name = useChildName();
  const journal = useApp((s) => s.journal);
  const demo = TRANSCRIPTS.filter((t) => t.kind === 'journal');

  const days: { day: string; items: typeof demo }[] = [];
  demo.forEach((t) => {
    const g = days.find((d) => d.day === t.day);
    if (g) g.items.push(t);
    else days.push({ day: t.day, items: [t] });
  });

  const answer = (lines: { from: string; text: string }[]) => lines.find((l) => l.from === 'me')?.text ?? '';

  return (
    <Screen backdrop="brand" header={<Header title={`${name}'s journal`} getHelp={false} fallback="/parent/home" />}>
      <Card tone="tint" padding={space.md}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="eye" size={18} color={c.brand} />
          <T v="bodySm" color="brand" style={{ flex: 1 }}>
            {name} knows you can read these.
          </T>
        </View>
      </Card>

      <Stagger>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Stat value={String(JOURNAL_STATS.entries + journal.length)} label="entries" />
          <Stat value={String(JOURNAL_STATS.words)} label="words" />
        </View>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1, gap: space.xs }}>
              <T v="bodySm" color="textSecondary">
                Feeling mentioned most
              </T>
              <T v="heading">{JOURNAL_STATS.feelingMost}</T>
              <T v="caption" color="textMuted">
                Felt better after writing: {JOURNAL_STATS.afterWriting} times
              </T>
            </View>
            <FaceCircle face={FACES.frownHexagon} tint={artTints.cyan} size={64} />
          </View>
        </Card>

        {journal.length ? (
          <View style={{ gap: space.md }}>
            <T v="section" header>
              Today
            </T>
            {journal.map((j, i) => (
              <CheckinCard
                key={i}
                caption={`JOURNAL · ${j.at}`}
                label={j.prompt}
                title={`“${j.text}”`}
                right={<FaceCircle face={FACES.smilePillPink} tint={artTints.yellow} size={64} />}
                onPress={() => router.push('/parent/transcript?id=live')}
              />
            ))}
          </View>
        ) : null}

        {days.map((d) => (
          <View key={d.day} style={{ gap: space.md }}>
            <T v="section" header>
              {d.day}
            </T>
            {d.items.map((t) => (
              <CheckinCard
                key={t.id}
                caption={`JOURNAL · ${t.time}`}
                label={t.opener}
                title={`“${answer(t.lines)}”`}
                right={<FaceCircle face={FACES.smilePillPink} tint={artTints.yellow} size={64} />}
                onPress={() => router.push(`/parent/transcript?id=${t.id}` as Href)}
                a11yLabel={`Journal, ${t.day}, ${t.time}. ${t.opener} ${answer(t.lines)}. Open`}
              />
            ))}
          </View>
        ))}
      </Stagger>
    </Screen>
  );
}
