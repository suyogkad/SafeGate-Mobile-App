/**
 * P19 Insights: Alex's week (tab root). The MoodChart (Alex's words, no scores), a "What Alex shared" summary, and
 * "What helps". Summaries are in Alex's words; no scores, no "anxiety" percentages, no red.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { MoodChart } from '@/components/MoodChart';
import { Screen } from '@/components/Screen';
import { Appear, Stagger } from '@/components/ui/Appear';
import { FaceCircle, ProgressBar, SectionHeader } from '@/components/ui/bits';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { DISCLAIMER, HELPS, SHARED, WEEK } from '@/data/insights';
import { useChildName } from '@/store/app';
import { artTints, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Insights() {
  const { c } = useTheme();
  const name = useChildName();

  return (
    <Screen inTabs backdrop="brand" header={<Header title="Insights" left="none" getHelp={false} />}>
      <SectionHeader title={`${name}'s week`} big action="View more" onAction={() => router.push('/parent/checkins')} />

      <Stagger>
        <Card tone="raised" r={24} padding={space.lg}>
          <MoodChart points={WEEK} />
        </Card>

        <View style={{ gap: space.md }}>
          <T v="section" header>
            What {name} shared
          </T>
          <Card tone="raised" r={24} padding={space.xl}>
            <View style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                <FaceCircle face={FACES.smileFlower} tint={artTints.lavender} size={48} />
                <T v="bodyLg" style={{ flex: 1 }}>
                  {SHARED}
                </T>
              </View>
              <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
                <Icon name="info" size={16} color={c.textMuted} />
                <T v="caption" color="textMuted" style={{ flex: 1 }}>
                  {DISCLAIMER}
                </T>
              </View>
            </View>
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <T v="section" header>
            What helps {name}
          </T>
          <Appear>
            <Card tone="raised" r={24} padding={space.lg}>
              <View style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <FaceCircle face={FACES.calmHexagon} tint={artTints.cyan} size={48} />
                  <View style={{ flex: 1 }}>
                    <T v="heading">{HELPS.title}</T>
                    <T v="bodySm" color="textMuted">
                      {HELPS.caption}
                    </T>
                  </View>
                </View>
                <ProgressBar value={HELPS.fill} label={`${HELPS.value}, about ${Math.round(HELPS.fill * 10)} in 10 times`} />
                <T v="bodySmMedium" color="brand">
                  {HELPS.value} · about {Math.round(HELPS.fill * 10)} in 10 times
                </T>
              </View>
            </Card>
          </Appear>
        </View>
      </Stagger>
    </Screen>
  );
}
