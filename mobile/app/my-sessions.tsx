/**
 * C22 My sessions. The session card (initials, date, kind, Join) and "Before your session" rows. Soft background.
 * Follows the booked session in the store (the parent's booking changes it). Video: Join is disabled until it
 * opens; in person: the clinic and address instead. Read-only: no calendar, cancel or reschedule.
 */
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear, Stagger } from '@/components/ui/Appear';
import { Avatar } from '@/components/ui/bits';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { BEFORE_SESSION } from '@/data/sessions';
import { useApp } from '@/store/app';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function MySessions() {
  const { c } = useTheme();
  const session = useApp((s) => s.session);
  const video = session?.kind === 'Video call';
  const initials = session?.therapist
    ? session.therapist
        .split(' ')
        .map((w) => w[0])
        .join('')
    : 'PS';

  return (
    <Screen header={<Header title="My sessions" fallback="/you" />}>
      <T v="bodyLg" color="textSecondary">
        Your next time with your therapist.
      </T>

      <Appear>
        {session ? (
          <Card tone="raised" r={24} padding={space.lg}>
            <View style={{ flexDirection: 'row', gap: space.lg }}>
              <Avatar initials={initials} size={64} />
              <View style={{ flex: 1, gap: space.sm }}>
                <Badge label={session.dateLabel.toUpperCase()} />
                <T v="heading" header>
                  Session with {session.therapistFirst}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Icon name={video ? 'video' : 'map-pin'} size={16} color={c.textMuted} />
                  <T v="bodySm" color="textSecondary">
                    {session.time} · {session.kind}
                  </T>
                </View>
                {video ? (
                  <View style={{ gap: space.xs, marginTop: space.xs }}>
                    <Button title="Join" size="small" icon="arrow-right" disabled label={`Join. Opens at ${session.joinOpens}`} />
                    <T v="caption" color="textMuted">
                      Join opens at {session.joinOpens}
                    </T>
                  </View>
                ) : (
                  <View style={{ backgroundColor: c.surface, borderRadius: radius.field, padding: space.md, marginTop: space.xs }}>
                    <T v="bodySmMedium">{session.place}</T>
                  </View>
                )}
              </View>
            </View>
          </Card>
        ) : (
          <Card tone="raised" r={24} padding={space.lg}>
            <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="calendar" size={26} color={c.brand} />
              </View>
              <T v="heading" center>
                No session booked yet
              </T>
              <T v="bodySm" color="textMuted" center>
                Your grown-up can book your next session with your therapist.
              </T>
            </View>
          </Card>
        )}
      </Appear>

      <View style={{ gap: space.md }}>
        <T v="section" header>
          Before your session
        </T>
        <Card tone="raised" padding={space.lg}>
          <View style={{ gap: space.md }}>
            <Stagger>
              {BEFORE_SESSION.map((b) => (
                <View key={b.text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                    <T v="heading" allowFontScaling={false} style={{ fontSize: 22, lineHeight: 28 }}>
                      {b.emoji}
                    </T>
                  </View>
                  <T v="bodyLg" style={{ flex: 1 }}>
                    {b.text}
                  </T>
                </View>
              ))}
            </Stagger>
          </View>
        </Card>
      </View>

      <Card tone="tint" padding={space.lg}>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
          <Icon name="message-circle" size={20} color={c.brand} />
          <T v="bodyLg" color="brand" style={{ flex: 1 }}>
            Some things are easier to say to a person. You can tell your therapist in your session.
          </T>
        </View>
      </Card>
    </Screen>
  );
}
