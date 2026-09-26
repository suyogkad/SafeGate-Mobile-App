/**
 * C06 Home "Your day" (tab root). A full-bleed hero ("Nothing here has to be done. Pick what helps.") with the
 * "Chat with AI" pill and Get help top-right, then a gentle timeline plan: the session row first, then the rows the
 * parent turned on in Alex's day (P23). Nothing counts, fills or celebrates; a done row gets a quiet tick.
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { CheckinCard } from '@/components/CheckinCard';
import { GetHelpButton } from '@/components/GetHelpButton';
import { HeroBand } from '@/components/HeroBand';
import { Screen } from '@/components/Screen';
import { Timeline } from '@/components/Timeline';
import { Appear } from '@/components/ui/Appear';
import { Avatar, FaceCircle } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { HOME_ROWS, homeRows } from '@/data/day';
import { FACES } from '@/data/faces';
import { greeting } from '@/lib/time';
import { useApp, useChildName } from '@/store/app';
import { artTints, gutter, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Home() {
  const { c } = useTheme();
  const name = useChildName();
  const session = useApp((s) => s.session);
  const day = useApp((s) => s.day);
  const done = useApp((s) => s.doneToday);
  const rows = homeRows(day);
  const initials = session.therapist
    .split(' ')
    .map((w) => w[0])
    .join('');

  return (
    <Screen inTabs padded={false} edgeToEdge>
      <StatusBar style="light" />
      <HeroBand topRight={<GetHelpButton onBrand />}>
        <View style={{ gap: space.sm }}>
          <T v="heading" color="onBrand" header>
            {greeting(name)}!
          </T>
          <T v="bodyLg" color="onBrand">
            Nothing here has to be done. Pick what helps.
          </T>
        </View>
        <Tappable
          label="Chat with AI. Opens Talk."
          onPress={() => router.push('/talk')}
          visualHeight={36}
          style={{ alignSelf: 'flex-start', height: 36, borderRadius: radius.pill, backgroundColor: c.primary, paddingLeft: space.lg, paddingRight: space.md, justifyContent: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <MaterialCommunityIcons name="star-four-points-outline" size={16} color={c.onPrimary} />
            <T v="bodySmMedium" color="onPrimary">
              Chat with AI
            </T>
          </View>
        </Tappable>
      </HeroBand>

      <View style={{ paddingHorizontal: gutter, gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
            <T v="section" header>
              Your day
            </T>
            <T v="caption" color="textMuted">
              (5 MIN)
            </T>
          </View>
          <Button title="Edit" variant="text" label="Edit your day settings" onPress={() => router.push('/you')} />
        </View>

        <Appear>
          <Timeline>
            {[
              <CheckinCard
                key="session"
                caption={`SESSION · ${session.short}`}
                title={`session with ${session.therapistFirst} at ${session.time.replace(' ', ' ')}`}
                right={<Avatar initials={initials} size={72} />}
                onPress={() => router.push('/my-sessions')}
              />,
              ...rows.map((id) => {
                const r = HOME_ROWS[id];
                return (
                  <CheckinCard
                    key={id}
                    caption={r.tag}
                    title={r.title}
                    done={done[id]}
                    right={<FaceCircle face={FACES[r.face]} tint={artTints[r.tint]} size={72} />}
                    onPress={() => router.push(r.href as Href)}
                  />
                );
              }),
            ]}
          </Timeline>
        </Appear>
      </View>
    </Screen>
  );
}
