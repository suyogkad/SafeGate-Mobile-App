/**
 * C03 Ask your grown-up first. One centred card with a character: the grown-up sets up the account and gives the
 * child a code. Back on the left, Get help on the right.
 */
import { router } from 'expo-router';
import { Image, View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/T';
import { FACES } from '@/data/faces';
import { space } from '@/theme/tokens';

export default function AskGrownUp() {
  return (
    <Screen
      header={<Header fallback="/welcome" />}
      footer={<Button title="I have a code" icon="arrow-right" onPress={() => router.push('/link-phone')} />}
      contentStyle={{ flexGrow: 1, justifyContent: 'center' }}
    >
      <Appear>
        <View style={{ alignItems: 'center', gap: space.lg, paddingHorizontal: space.sm }}>
          <Image
            source={FACES.smileFlowerAmber}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ width: 140, height: 140 }}
          />
          <T v="title" center header>
            Ask your grown-up first
          </T>
          <T v="body" color="textSecondary" center>
            A grown-up who looks after you sets up your account. Then they give you a code to type in here.
          </T>
        </View>
      </Appear>
    </Screen>
  );
}
