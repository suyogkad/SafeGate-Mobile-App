/**
 * P22 Share with Priya (dialog). A centred confirmation card on the brand background (it's a route, reached from
 * Home, the transcript and quick actions). Share → shareWeek(); the same card confirms "Shared with Priya".
 * Chats are only shared if the parent chooses them: nothing else leaves.
 */
import { Image, View } from 'react-native';
import { goBack } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { ART } from '@/data/faces';
import { THERAPIST } from '@/data/people';
import { useApp, useChildName } from '@/store/app';
import { radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Share() {
  const { c } = useTheme();
  const name = useChildName();
  const shared = useApp((s) => s.sharedWeek);
  const session = useApp((s) => s.session);
  const weekday = session ? session.dateLabel.split(' ')[0] : 'your next';

  return (
    <Screen backdrop="brand" contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Appear>
        <View
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
          style={{ backgroundColor: c.bg, borderRadius: radius.panel, padding: space.xl, gap: space.lg, alignItems: 'center', ...shadow.lift }}
        >
          <Image source={ART.cheer} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" style={{ width: 104, height: 104 }} />
          {shared ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Icon name="check-circle" size={24} color={c.onSuccessTint} />
                <T v="title" header>
                  Shared with {THERAPIST.first}
                </T>
              </View>
              <T v="body" color="textSecondary" center>
                {THERAPIST.first} can see {name}'s check-ins and this week's summary before {weekday}'s session.
              </T>
              <Button title="Done" onPress={() => goBack('/parent/home')} style={{ alignSelf: 'stretch' }} />
            </>
          ) : (
            <>
              <T v="title" center header>
                Share this week with {THERAPIST.first}?
              </T>
              <T v="body" color="textSecondary" center>
                {THERAPIST.first} will see {name}'s check-ins and this summary before {weekday}'s session. Chats are only shared if you choose them.
              </T>
              <View style={{ alignSelf: 'stretch', gap: space.sm }}>
                <Button title="Share" icon="send" onPress={() => useApp.getState().shareWeek()} />
                <Button title="Not now" variant="outline" onPress={() => goBack('/parent/home')} />
              </View>
            </>
          )}
        </View>
      </Appear>
    </Screen>
  );
}
