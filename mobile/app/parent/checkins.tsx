/**
 * P20 Check-ins overview. Segmented Day | Week (default) | Month, the MoodChart, "Good days" count tiles, emoji
 * chips for what makes Alex happy / what makes things hard, and the longer summary. Day shows today's real check-in.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { CheckinCard } from '@/components/CheckinCard';
import { Header } from '@/components/Header';
import { MoodChart } from '@/components/MoodChart';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { FaceCircle, ProgressBar } from '@/components/ui/bits';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { DISCLAIMER, GOOD_DAYS, HAPPY, HARD, MONTH, SHARED_LONG, TODAY_CHECKIN, WEEK } from '@/data/insights';
import { mood as moodById } from '@/data/moods';
import { useApp, useChildName } from '@/store/app';
import { moodColors, radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const RANGES = ['Day', 'Week', 'Month'] as const;

function EmojiChips({ items }: { items: { emoji: string; text: string }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {items.map((i) => (
        <View key={i.text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: c.bg, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.md, ...shadow.lift }}>
          <T v="bodyLg" allowFontScaling={false}>
            {i.emoji}
          </T>
          <T v="bodySmMedium">{i.text}</T>
        </View>
      ))}
    </View>
  );
}

export default function Checkins() {
  const { c } = useTheme();
  const name = useChildName();
  // ?range=Day opens today's check-in (from a notification); Week is the default.
  const params = useLocalSearchParams<{ range?: string }>();
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES.find((r) => r === params.range) ?? 'Week');
  const live = useApp((s) => s.checkin);
  const today = live ? { mood: live.mood, time: live.at, feelings: live.feelings, topics: live.topics } : TODAY_CHECKIN;
  const tm = moodById(today.mood);

  return (
    <Screen backdrop="brand" header={<Header title="Check-ins" getHelp={false} fallback="/parent/insights" />}>
      <Segmented label="Show check-ins for" options={RANGES} value={range} onChange={setRange} />

      <Stagger key={range}>
        {range === 'Day' ? (
          <View style={{ gap: space.md }}>
            <T v="section" header>
              Today
            </T>
            <CheckinCard
              caption={`Today · ${today.time}`}
              label="Checked in"
              title={tm.label}
              titleColor={moodColors[tm.id].word}
              right={<FaceCircle face={tm.face} tint={moodColors[tm.id].tint} size={72} />}
            />
            {[...today.feelings, ...today.topics].length ? (
              <EmojiChips items={[...today.feelings.map((f) => ({ emoji: '💬', text: f })), ...today.topics.map((t) => ({ emoji: '📍', text: t }))]} />
            ) : null}
          </View>
        ) : (
          <Card tone="raised" r={24} padding={space.lg}>
            <MoodChart key={range} points={range === 'Week' ? WEEK : MONTH} />
          </Card>
        )}

        <View style={{ gap: space.md }}>
          <View>
            <T v="section" header>
              Good days
            </T>
            <T v="bodySm" color="textMuted">
              How many days felt Ok or better?
            </T>
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <View style={{ flex: 1, backgroundColor: c.bg, borderRadius: radius.panel, padding: space.lg, gap: 2, ...shadow.lift }}>
              <T v="title" tint={moodColors.good.word}>
                {GOOD_DAYS.good} days
              </T>
              <T v="bodySm" color="textSecondary">
                Ok or better
              </T>
            </View>
            <View style={{ flex: 1, backgroundColor: c.bg, borderRadius: radius.panel, padding: space.lg, gap: 2, ...shadow.lift }}>
              <T v="title" color="brand">
                {GOOD_DAYS.other} days
              </T>
              <T v="bodySm" color="textSecondary">
                Harder days
              </T>
            </View>
          </View>
          <Card tone="raised" r={24} padding={space.lg}>
            <View style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T v="bodyLg">Compared with last week</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="trending-up" size={16} color={moodColors.good.word} />
                  <T v="bodyLg" tint={moodColors.good.word}>
                    {GOOD_DAYS.vsLastWeek}
                  </T>
                </View>
              </View>
              <ProgressBar value={GOOD_DAYS.fill} label={`${GOOD_DAYS.good} of ${GOOD_DAYS.good + GOOD_DAYS.other} days felt Ok or better`} />
            </View>
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <T v="section" header>
            What makes {name} happy
          </T>
          <EmojiChips items={HAPPY} />
        </View>

        <View style={{ gap: space.md }}>
          <T v="section" header>
            What makes things hard
          </T>
          <EmojiChips items={HARD} />
        </View>

        <View style={{ gap: space.md }}>
          <T v="section" header>
            What {name} shared
          </T>
          <Card tone="tint" r={24} padding={space.xl}>
            <View style={{ gap: space.md }}>
              <T v="bodyLg" color="brand">
                {SHARED_LONG}
              </T>
              <T v="caption" color="textSecondary">
                {DISCLAIMER}
              </T>
            </View>
          </Card>
        </View>
      </Stagger>
    </Screen>
  );
}
