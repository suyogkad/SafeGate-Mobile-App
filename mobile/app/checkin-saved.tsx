/**
 * C14 Check-in saved. One centred confirmation with the chosen mood's character in its tint. Confirms the action
 * without celebrating: no confetti, no count. Get help only (no back). Bad / Not great also offer Calm me.
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Image, View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { MOODS, mood as moodById, type MoodId } from '@/data/moods';
import { useApp } from '@/store/app';
import { moodColors, radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function CheckinSaved() {
  const { c } = useTheme();
  const param = useLocalSearchParams<{ mood?: string }>().mood;
  const stored = useApp((s) => s.checkin?.mood);
  const id: MoodId = MOODS.some((m) => m.id === param) ? (param as MoodId) : (stored ?? 'ok');
  const m = moodById(id);
  const low = id === 'bad' || id === 'notGreat';

  return (
    <Screen
      header={<Header left="none" />}
      contentStyle={{ flexGrow: 1, justifyContent: 'center' }}
      footer={
        <View style={{ gap: space.sm }}>
          <Button title="Back to home" onPress={() => router.replace('/home')} />
          <Button title="Talk about it" variant="outline" iconLeft="message-circle" onPress={() => router.replace('/talk')} />
          {low ? <Button title="Calm me" variant="outline" iconLeft="wind" onPress={() => router.replace('/calm' as Href)} /> : null}
        </View>
      }
    >
      <Appear>
        <View style={{ backgroundColor: c.bg, borderRadius: radius.panel, padding: space.xl, alignItems: 'center', gap: space.lg, ...shadow.lift }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ width: 140, height: 140, borderRadius: radius.pill, backgroundColor: moodColors[id].tint, alignItems: 'center', justifyContent: 'center' }}
          >
            <Image source={m.face} resizeMode="contain" style={{ width: 96, height: 96 }} />
          </View>
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <T v="title" center header>
              Thanks for telling me.
            </T>
            <T v="body" color="textSecondary" center>
              That's all. Nothing else to do.
            </T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: c.surface, borderRadius: radius.pill, paddingVertical: space.sm, paddingHorizontal: space.md }}>
            <Icon name="eye" size={16} color={c.textMuted} />
            <T v="bodySm" color="textSecondary">
              Your grown-up can see this check-in.
            </T>
          </View>
        </View>
      </Appear>
    </Screen>
  );
}
