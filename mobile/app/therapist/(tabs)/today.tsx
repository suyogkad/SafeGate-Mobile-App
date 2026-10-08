/**
 * T01 Therapist Today (tab root). Built like parent Home: a navy hero (a bell with
 * what needs the therapist + their initials; the pill button opens My hours), then
 * "Needs attention" (safety alerts about their own clients), today's sessions,
 * "Coming up", this week's open times as chips, and quick-action tiles.
 *
 * Everything here is this therapist's real data. A section with nothing in it says
 * so, rather than filling in with something invented.
 */
import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { HeroBand } from '@/components/HeroBand';
import { QuickTile, TileGrid } from '@/components/QuickTile';
import { Screen } from '@/components/Screen';
import { SessionCard, withComma } from '@/components/SessionCard';
import { Appear } from '@/components/ui/Appear';
import { Avatar, SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { CountBadge } from '@/components/ui/CountBadge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { dayLabel, dayShort, localDateIso, localStartMinutes, timeLabel } from '@/lib/schedule';
import { useClients, useMyOpenTimes, useTherapistAlerts, useTherapistSessions } from '@/lib/clients';
import { noteAlert } from '@/api/therapist';
import { firstName, greeting, initialsOf, longDate, partOfDay } from '@/lib/time';
import { useApp } from '@/store/app';
import { gutter, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const ALERT_AT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export default function TherapistToday() {
  const { c } = useTheme();

  // Real safety alerts about this therapist's own clients, urgent first.
  const { alerts, reload: reloadAlerts } = useTherapistAlerts(true);
  const needs = [...alerts].sort((a, b) => Number(b.level === 'urgent') - Number(a.level === 'urgent'));

  const me = useApp((s) => s.account?.name) ?? null;
  const sessions = useTherapistSessions();
  const clients = useClients();
  const comingUp = sessions
    .filter((s) => s.status === 'booked' && new Date(s.start_time).getTime() > Date.now())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 3);
  // The therapist's real open times, this week only.
  const therapistId = useApp((s) => s.account?.id) ?? null;
  const allOpen = useMyOpenTimes(therapistId);
  const weekEnd = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const openTimes = allOpen
    .filter((o) => {
      const t = new Date(o.start_time).getTime();
      return t > Date.now() && t < weekEnd;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const todayIso = new Date().toDateString();
  const todaySessions = sessions.filter(
    (x) => x.status === 'booked' && new Date(x.start_time).toDateString() === todayIso,
  );
  // Past sessions with nothing written yet: the other thing that actually needs
  // the therapist, and what the bell counts alongside alerts.
  const notesDue = sessions.filter(
    (s) => s.status === 'completed' && s.notes_written === false,
  ).length;
  const unread = needs.length + notesDue;

  const actions: { title: string; icon: IconName; href: Href }[] = [
    { title: 'Set my hours', icon: 'clock', href: '/therapist/availability' },
    { title: 'Add time off', icon: 'sun', href: '/therapist/slot?mode=off' },
    { title: 'Clients', icon: 'users', href: '/therapist/clients' },
    { title: 'Notifications', icon: 'bell', href: '/therapist/notifications' },
  ];

  return (
    <Screen inTabs padded={false} edgeToEdge>
      <StatusBar style="light" />
      <HeroBand
        topRight={
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Tappable
              label={`Notifications, ${unread ? `${unread} needing you` : 'nothing needing you'}`}
              onPress={() => router.push('/therapist/notifications')}
              visualHeight={44}
            >
              <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={22} color={c.brand} />
                <CountBadge count={unread} ring={c.brand} />
              </View>
            </Tappable>
            <Tappable label={`${me || 'Your account'}. Open account`} onPress={() => router.push('/therapist/account')} visualHeight={44}>
              <Avatar initials={initialsOf(me)} size={44} />
            </Tappable>
          </View>
        }
      >
        <View style={{ gap: space.sm }}>
          <T v="heading" color="onBrand" header>
            {me ? greeting(firstName(me)) : `Good ${partOfDay()}`}
          </T>
          <T v="bodyLg" color="onBrand">
            {longDate()}
          </T>
        </View>
        <Button title="My hours" size="small" icon="arrow-right" onPress={() => router.push('/therapist/availability')} />
      </HeroBand>

      <View style={{ paddingHorizontal: gutter, gap: space.xl }}>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Needs attention" />
          {needs.length ? (
            needs.map((a, i) => (
              <Appear key={a.id} delay={i * 60}>
                <Card padding={space.lg}>
                  <View style={{ gap: space.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                      <Icon name="alert-circle" size={22} color={c.onHelpTint} />
                      <T v="bodyLg" style={{ flex: 1 }}>
                        {a.child_name ?? 'A client'}’s app switched to calm steps
                      </T>
                    </View>
                    <T v="bodySm" color="textMuted">
                      {ALERT_AT.format(new Date(a.timestamp))} ·{' '}
                      {a.parent_seen_at ? 'The family has seen this' : 'Not seen by the family yet'}
                    </T>
                    <Button
                      title="Noted"
                      size="small"
                      variant="outline"
                      style={{ alignSelf: 'flex-start' }}
                      label={`Mark ${a.child_name ?? 'this'} alert as noted. It clears your list only.`}
                      onPress={async () => {
                        try {
                          await noteAlert(a.id);
                        } finally {
                          reloadAlerts();
                        }
                      }}
                    />
                  </View>
                </Card>
              </Appear>
            ))
          ) : (
            <Card padding={space.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Icon name="check-circle" size={22} color={c.onSuccessTint} />
                <T v="bodyLg" color="textSecondary">
                  Nothing needs you right now
                </T>
              </View>
            </Card>
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Today" />
          {todaySessions.length === 0 ? (
            <Card padding={space.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Icon name="calendar" size={22} color={c.textSecondary} />
                <T v="bodyLg" color="textSecondary">
                  No sessions today
                </T>
              </View>
            </Card>
          ) : (
            todaySessions.map((x) => {
              const at = new Date(x.start_time);
              return (
                <SessionCard
                  key={x.id}
                  date={localDateIso(at)}
                  start={localStartMinutes(at)}
                  initials={(x.child_name ?? '?').charAt(0)}
                  tag={x.meeting_kind === 'video' ? 'VIDEO CALL' : 'IN PERSON'}
                  line={x.child_name ?? 'Client'}
                  label={`Today, ${timeLabel(at.getHours() * 60 + at.getMinutes())}. ${x.child_name ?? 'Client'}. Open the session`}
                  onPress={() => router.push(`/therapist/session?id=${x.id}` as Href)}
                />
              );
            })
          )}
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Coming up" action="Calendar" actionLabel="Open the calendar" onAction={() => router.push('/therapist/calendar')} />
          {comingUp.length === 0 ? (
            <T v="body" color="textMuted">
              No sessions booked yet. Families book from their own app.
            </T>
          ) : null}
          {comingUp.map((s, i) => {
            const at = new Date(s.start_time);
            const date = localDateIso(at);
            const start = localStartMinutes(at);
            const who = s.child_name ?? 'Client';
            const parent = clients.find((c) => c.id === s.child_id)?.parent;
            const kind = s.meeting_kind === 'video' ? 'Video call' : 'In person';
            return (
              <Appear key={s.id} delay={i * 60}>
                <SessionCard
                  date={date}
                  start={start}
                  initials={who.charAt(0)}
                  tag={kind.toUpperCase()}
                  line={parent ? `${who} · with ${parent}` : who}
                  label={`${withComma(dayLabel(date))}, ${timeLabel(start)}. ${who}, ${kind.toLowerCase()}${parent ? `, with ${parent}` : ''}. Open the session`}
                  onPress={() => router.push(`/therapist/session?id=${s.id}` as Href)}
                />
              </Appear>
            );
          })}
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Open times this week" />
          {openTimes.length ? null : (
            <T v="body" color="textMuted">
              No open times this week. Add some in My hours.
            </T>
          )}
          <ChipRow>
            {openTimes.map((o) => {
              const at = new Date(o.start_time);
              const date = localDateIso(at);
              const start = localStartMinutes(at);
              return (
                <Chip
                  key={o.id}
                  label={`${dayShort(date).split(' ')[0]} ${timeLabel(start)}`}
                  a11yLabel={`Open time, ${dayLabel(date)}, ${timeLabel(start)}. Change or remove`}
                  onPress={() => router.push(`/therapist/slot?slot=${o.id}` as Href)}
                />
              );
            })}
          </ChipRow>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Quick actions" />
          <TileGrid>
            {actions.map((a) => (
              <QuickTile key={a.title} title={a.title} icon={a.icon} onPress={() => router.push(a.href)} />
            ))}
          </TileGrid>
        </View>
      </View>
    </Screen>
  );
}
