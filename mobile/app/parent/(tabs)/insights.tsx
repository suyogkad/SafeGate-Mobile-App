/**
 * P19 Insights: <child>'s week (tab root). An interactive mood chart in the child's own
 * words, a "What <child> shared" summary and "What helps".
 *
 * Check-ins have no endpoint yet: nothing a child feels is recorded anywhere. So this
 * screen says so rather than drawing a chart. A plausible week of moods here would be
 * read as something the child actually said, and a parent might act on it — which is
 * the one thing an insights screen must never cause.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { NotRecordedYet } from '@/components/NotRecordedYet';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { useMyChild } from '@/lib/family';
import { artTints, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Insights() {
  const { c } = useTheme();
  const child = useMyChild();
  const name = child?.full_name || 'your child';

  return (
    <Screen inTabs backdrop="brand" header={<Header title="Insights" left="none" getHelp={false} />}>
      <SectionHeader title={`${name}'s week`} big />

      <Stagger>
        <NotRecordedYet
          title="No check-ins yet"
          line={`When ${name} says how they feel in their app, their week shows here in their own words — no scores, no labels.`}
          face="smileFlower"
          tint={artTints.lavender}
        />

        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <Icon name="info" size={18} color={c.textMuted} />
            <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>
              Anything here will be based on what {name} chose to share. It isn’t medical advice. Talk to their
              therapist about anything that worries you.
            </T>
          </View>
        </Card>

        <View style={{ gap: space.md }}>
          <SectionHeader title="What you can read now" />
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            <View style={{ gap: space.md, paddingVertical: space.md }}>
              <T v="body" color="textSecondary">
                {name}’s chats with the AI companion are real and you can read them, and your therapist’s notes
                appear after each session.
              </T>
              <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                <Button title="Read chats" size="small" variant="outline" onPress={() => router.push('/parent/chats')} />
                <Button title="Sessions" size="small" variant="outline" onPress={() => router.push('/parent/sessions')} />
              </View>
            </View>
          </Card>
        </View>
      </Stagger>
    </Screen>
  );
}
