/**
 * T07 Session. Session notes' header card (initial + "Session with Alex" + date, time, kind, parent), then:
 *  - before it: "Since the last session", a facts card like the Alert's (check-ins shared, alerts, what helped at
 *    home: only what the family shared), and the last "Things to try at home"; sticky Join video call (demo) or the
 *    clinic address.
 *  - after it: the notes, in their two parts (shared with the family / only you), or "No notes yet"; sticky
 *    Write notes / Edit notes.
 * ?id=<booking id>
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { TryAtHome } from '@/components/NotesParts';
import { NotesPreview } from '@/components/NotesPreview';
import { Screen } from '@/components/Screen';
import { Appear, Stagger } from '@/components/ui/Appear';
import { Avatar, Divider, SectionHeader } from '@/components/ui/bits';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { HELPS } from '@/data/insights';
import { ALEX_PAST, CLIENTS, OTHER_CLIENT_SHARING } from '@/data/practice';
import { demoOnly } from '@/lib/call';
import { latestShared } from '@/lib/clients';
import { dayLabel, dayShort, DEMO_TODAY, rangeLabel, timeLabel } from '@/lib/schedule';
import { useApp, useBookings, useChildName, useTherapist } from '@/store/app';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

function Fact({ label, children, last }: { label: string; children: string; last?: boolean }) {
  return (
    <View style={{ gap: space.xs, paddingVertical: space.md }}>
      <T v="bodySm" color="textMuted">
        {label}
      </T>
      <T v="bodyLg">{children}</T>
      {last ? null : (
        <View style={{ marginTop: space.md }}>
          <Divider />
        </View>
      )}
    </View>
  );
}

export default function Session() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const bookings = useBookings();
  const childName = useChildName();
  const notes = useApp((s) => s.sessionNotes);
  const sharedWeek = useApp((s) => s.sharedWeek);
  const calmMode = useApp((s) => s.calmMode);
  const calmAt = useApp((s) => s.calmAt);
  const booking = [...bookings, ...ALEX_PAST].find((b) => b.id === params.id);

  if (!booking) {
    return (
      <Screen backdrop="brand" header={<Header title="Session" left="close" getHelp={false} fallback="/therapist/calendar" />}>
        <Card tone="raised" padding={space.lg}>
          <T v="bodyLg" color="textSecondary">
            This session isn’t on your calendar any more.
          </T>
        </Card>
      </Screen>
    );
  }

  const client = CLIENTS[booking.clientId];
  const name = booking.clientId === 'alex' ? childName : client.name;
  const alex = booking.clientId === 'alex';
  const upcoming = booking.date > DEMO_TODAY;
  const n = notes[booking.id];
  const clinic = useTherapist('priya').clinic;
  const lastPast = ALEX_PAST.find((p) => p.date < booking.date);
  const lastTry = alex ? (latestShared(notes)?.tryAtHome ?? []) : [];
  const other = alex ? null : OTHER_CLIENT_SHARING[booking.clientId as 'mia' | 'leo'];

  const footer = upcoming ? (
    booking.kind === 'Video call' ? (
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="clock" size={16} color={c.textMuted} />
          <T v="bodySm" color="textSecondary">
            The join link opens at {timeLabel(booking.start - 10)}.
          </T>
        </View>
        <Button title="Join video call" iconLeft="video" onPress={() => demoOnly('In the real app this opens the video call with the family.')} />
      </View>
    ) : (
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="map-pin" size={16} color={c.textMuted} />
          <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>
            In person · {clinic ? `${clinic.name} clinic, ${clinic.address}` : 'at the clinic'}
          </T>
        </View>
        <Button title={`Open ${name}’s page`} variant="outline" icon="arrow-right" onPress={() => router.push(`/therapist/client?id=${booking.clientId}` as Href)} />
      </View>
    )
  ) : alex ? (
    <Button
      title={n?.sharedAt ? 'Edit notes' : n ? 'Keep writing' : 'Write notes'}
      icon={n?.sharedAt ? 'edit-2' : 'arrow-right'}
      onPress={() => router.push(`/therapist/notes?session=${booking.id}` as Href)}
    />
  ) : undefined;

  return (
    <Screen backdrop="brand" header={<Header title="Session" left="close" getHelp={false} fallback="/therapist/calendar" />} footer={footer}>
      <Appear>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <Avatar initials={name.charAt(0)} size={64} tone="brand" />
            <View style={{ flex: 1, gap: space.xs }}>
              <Badge label={booking.kind.toUpperCase()} tone="info" />
              <T v="heading" header>
                Session with {name}
              </T>
              <T v="bodySm" color="textMuted">
                {dayLabel(booking.date)} · {rangeLabel(booking.start, booking.start + booking.lengthMin)}
              </T>
              <T v="bodySm" color="textMuted">
                Parent: {client.parent}
              </T>
            </View>
          </View>
        </Card>
      </Appear>

      {upcoming ? (
        <Stagger>
          <View style={{ gap: space.md }}>
            <SectionHeader title={lastPast && alex ? `Since the last session (${dayShort(lastPast.date)})` : 'Before the session'} />
            <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
              {alex ? (
                <>
                  <Fact label="Check-ins shared">{sharedWeek ? '5 this week · mostly Ok, mornings were hardest' : `Not shared yet. ${client.parentFirst} shares the week before a session.`}</Fact>
                  <Fact label="Alerts">{calmMode !== 'off' ? `1 · Today, ${calmAt ?? ''}: calm steps` : 'None'}</Fact>
                  <Fact label="What helped at home" last>
                    {sharedWeek ? `${HELPS.title}: ${name} checked in ${HELPS.value.toLowerCase()} afterwards` : 'Shows with the week’s check-ins'}
                  </Fact>
                </>
              ) : (
                <Fact label={`What ${client.parentFirst} shared`} last>
                  {other?.summary ?? `${client.parentFirst} hasn’t shared this week yet.`}
                </Fact>
              )}
            </Card>
          </View>
          {lastTry.length ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title="Things to try at home (last time)" />
              <TryAtHome items={lastTry} />
            </View>
          ) : null}
        </Stagger>
      ) : n ? (
        <NotesPreview notes={n} parentFirst={client.parentFirst} name={name} />
      ) : (
        <Card tone="raised" r={24} padding={space.xl}>
          <View style={{ gap: space.sm }}>
            <T v="heading">No notes yet</T>
            <T v="body" color="textSecondary">
              Write what {client.parentFirst} should know, and your own working notes. {client.parentFirst} only sees the part you share.
            </T>
          </View>
        </Card>
      )}
    </Screen>
  );
}
