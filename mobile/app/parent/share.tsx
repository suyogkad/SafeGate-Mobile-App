/**
 * P22 Share with your therapist. A centred confirmation card: sharing with the therapist
 * is always the parent's explicit choice, and chats are only shared one at a time.
 *
 * There is no sharing endpoint yet, and the therapist's own screens say the same thing
 * from their side ("Nothing shared yet"). So this screen does not pretend to share:
 * it says what sharing will do and what the therapist can already see, because telling
 * a parent their child's week went to their therapist when it did not is worse than
 * saying "not yet".
 */
import { router } from 'expo-router';
import { Image, View } from 'react-native';
import { goBack } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { ART } from '@/data/faces';
import { useFamilySessions, useMyChild } from '@/lib/family';
import { firstName } from '@/lib/time';
import { radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Share() {
  const { c } = useTheme();
  const child = useMyChild();
  const sessions = useFamilySessions();
  const name = child?.full_name || 'your child';
  const therapist = child?.therapist_name ?? sessions[0]?.therapist_name ?? null;
  const therapistFirst = therapist ? firstName(therapist) : 'your therapist';

  return (
    <Screen backdrop="brand" contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Appear>
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.bg,
            borderRadius: radius.panel,
            padding: space.xl,
            gap: space.lg,
            alignItems: 'center',
            ...shadow.lift,
          }}
        >
          <Image
            source={ART.cheer}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ width: 108, height: 108 }}
          />
          <T v="heading" center header>
            Sharing isn’t ready yet
          </T>
          <T v="body" color="textSecondary" center>
            Sending {name}’s week to {therapistFirst} is still being built. When it is ready, you’ll choose exactly
            what goes — and chats only ever go one at a time, when you pick them.
          </T>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <Icon name="lock" size={18} color={c.textMuted} />
            <T v="bodySm" color="textMuted" style={{ flex: 1 }}>
              Until then {therapistFirst} sees only their own sessions with {name}, and is told straight away if{' '}
              {name}’s app switches to calm steps.
            </T>
          </View>
          <Button title="Back" variant="outline" onPress={() => goBack('/parent/home')} />
          <Button
            title="See their sessions"
            variant="text"
            style={{ alignSelf: 'center' }}
            onPress={() => router.replace('/parent/sessions')}
          />
        </View>
      </Appear>
    </Screen>
  );
}
