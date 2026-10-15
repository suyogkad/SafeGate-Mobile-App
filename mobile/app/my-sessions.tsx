/**
 * C22 My sessions. The session card (initials, date, kind) and "Before your session"
 * rows. Read-only: no calendar, cancel or reschedule -- booking and changing a time is
 * the parent's.
 *
 * Real: the child's own sessions from `GET /companion/my-sessions`, which is smaller
 * than the adults' view on purpose. There is no Join here: the video link is issued per
 * participant to the parent and the therapist, and the child is with their parent. The
 * card says when it opens instead of offering a button that would be refused.
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
import { nextSessionOf, useMySessions } from '@/lib/child';
import { dayLabel, localDateIso } from '@/lib/schedule';
import { clockOf, firstName, initialsOf } from '@/lib/time';
import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const OPENS_EARLY_MIN = 10;

export default function MySessions() {
  const { c } = useTheme();
  const sessions = useMySessions();
  const session = nextSessionOf(sessions);
  const video = session?.meeting_kind === 'video';
  const who = session?.therapist_name ?? null;

  return (
    <Screen header={<Header title="My sessions" fallback="/you" />}>
      <T v="bodyLg" color="textSecondary">
        Your next time with your therapist.
      </T>

      <Appear>
        {session ? (
          <Card tone="raised" r={24} padding={space.lg}>
            <View style={{ flexDirection: 'row', gap: space.lg }}>
              <Avatar initials={who ? initialsOf(who) : '?'} size={64} />
              <View style={{ flex: 1, gap: space.sm }}>
                <Badge label={dayLabel(localDateIso(new Date(session.start_time))).toUpperCase()} />
                <T v="heading" header>
                  {who ? `Session with ${firstName(who)}` : 'Your next session'}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Icon name={video ? 'video' : 'map-pin'} size={16} color={c.textMuted} />
                  <T v="bodySm" color="textSecondary">
                    {clockOf(session.start_time)} · {video ? 'Video call' : 'In person'}
                  </T>
                </View>
                {video ? (
                  <T v="caption" color="textMuted" style={{ marginTop: space.xs }}>
                    Your grown-up opens the call at{' '}
                    {clockOf(new Date(session.start_time).getTime() - OPENS_EARLY_MIN * 60_000)}.
                  </T>
                ) : session.clinic_name ? (
                  <View style={{ backgroundColor: c.surface, borderRadius: radius.field, padding: space.md, marginTop: space.xs }}>
                    <T v="bodySmMedium">{session.clinic_name}</T>
                  </View>
                ) : null}
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
                {sessions === null ? 'Just a moment…' : 'No session booked yet'}
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
