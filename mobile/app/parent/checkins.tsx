/**
 * P20 Check-ins overview. Day | Week | Month, the same interactive chart as Insights,
 * "Good days", "Compared with last week" and what makes things easier or harder.
 *
 * Check-ins have no endpoint yet, so there is nothing to chart. Showing a week of
 * invented moods would read as something the child actually said.
 */
import { router } from 'expo-router';
import { Header } from '@/components/Header';
import { NotRecordedYet } from '@/components/NotRecordedYet';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { useMyChild } from '@/lib/family';
import { artTints } from '@/theme/tokens';

export default function Checkins() {
  const child = useMyChild();
  const name = child?.full_name || 'your child';

  return (
    <Screen backdrop="brand" header={<Header title="Check-ins" getHelp={false} fallback="/parent/insights" />}>
      <Stagger>
        <NotRecordedYet
          title="No check-ins yet"
          line={`${name} hasn’t said how they feel in their app yet. When they do, you’ll see it here in their words, with what it was about.`}
          face="smileFlower"
          tint={artTints.lavender}
        />
        <Button title="Read their chats instead" variant="outline" iconLeft="message-circle" onPress={() => router.push('/parent/chats')} />
      </Stagger>
    </Screen>
  );
}
