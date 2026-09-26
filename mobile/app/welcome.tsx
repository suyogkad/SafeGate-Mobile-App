/**
 * C02 Welcome. The wordmark, a character collage, two big choice tiles (I'm a kid / I'm a parent or carer), the
 * "I already have a code" and "I'm a therapist" links, and the emergency note with Call 000 in the help tint.
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { ChoiceTile } from '@/components/ChoiceTile';
import { EmergencyNote } from '@/components/EmergencyNote';
import { FaceCollage } from '@/components/FaceCollage';
import { GetHelpButton } from '@/components/GetHelpButton';
import { Screen } from '@/components/Screen';
import { Wordmark } from '@/components/Wordmark';
import { Appear } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { gutter, moodColors, space } from '@/theme/tokens';

export default function Welcome() {
  return (
    <Screen
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: gutter, paddingTop: space.sm, minHeight: 56 }}>
          <Wordmark size={26} />
          <GetHelpButton />
        </View>
      }
    >
      <Appear>
        <FaceCollage height={170} />
      </Appear>

      <View style={{ gap: space.xs }}>
        <T v="title" header>
          Welcome.
        </T>
        <T v="bodyLg" color="textMuted">
          Who is holding this phone?
        </T>
      </View>

      <View style={{ gap: space.md }}>
        <ChoiceTile
          title="I'm a kid"
          hint="This phone is mine"
          face={FACES.smileBlobCyan}
          tint={moodColors.notGreat.tint}
          onPress={() => router.push('/ask-grown-up')}
        />
        <ChoiceTile
          title="I'm a parent or carer"
          hint="I look after a child who will use this"
          face={FACES.crownEgg}
          tint={moodColors.great.tint}
          onPress={() => router.push('/parent/create-account')}
        />
        <Button title="I already have a code" variant="text" style={{ alignSelf: 'center' }} onPress={() => router.push('/link-phone')} />
        <Button title="I'm a therapist" variant="text" style={{ alignSelf: 'center' }} onPress={() => router.push('/therapist/sign-in')} />
      </View>

      <EmergencyNote callButton />
    </Screen>
  );
}
