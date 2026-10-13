/**
 * P21 <child>'s journal. "<child> knows you can read these", then their entries by day.
 *
 * The journal has no endpoint yet: nothing a child writes in it is saved anywhere. So
 * this says so. Their chats with the companion *are* saved, and are the real thing a
 * parent can read today.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { NotRecordedYet } from '@/components/NotRecordedYet';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { useMyChild } from '@/lib/family';
import { artTints, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Journal() {
  const { c } = useTheme();
  const child = useMyChild();
  const name = child?.full_name || 'your child';

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
        <NotRecordedYet
          title="No journal entries yet"
          line={`Nothing ${name} writes in their journal is saved yet. Their chats with the AI companion are, and you can read those now.`}
          face="smilePillPink"
          tint={artTints.yellow}
        />
        <Button title="Read their chats" variant="outline" iconLeft="message-circle" onPress={() => router.push('/parent/chats')} />
      </Stagger>
    </Screen>
  );
}
