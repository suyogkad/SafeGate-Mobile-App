/**
 * T07 Session. Session notes' header card (initial + "Session with <child>" + date, time, kind, parent), then:
 *  - before it: what the therapist knows going in, and the last "Things to try at home"; sticky Join video call
 *    or the clinic address.
 *  - after it: the notes, in their two parts (shared with the family / only you), or "No notes yet"; sticky
 *    Write notes / Edit notes.
 *
 * Everything here is the real session: the backend only hands a therapist their own.
 * What a *family* has chosen to share (their week's check-ins, their summary) has no
 * endpoint yet, so those facts say so rather than showing invented ones -- a therapist
 * reading a made-up mood before a session would be worse than a blank.
 * ?id=<session id>
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
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
import { useClients, useTherapistAlerts } from '@/lib/clients';
import { dayLabel, localDateIso, localStartMinutes, rangeLabel, timeLabel } from '@/lib/schedule';
import { asNotesView, hasNotes, useLastSuggestions, useMe, useSession, useSessionNotes } from '@/lib/therapist';
import { callIsOpen, joinCall } from '@/lib/video';
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

const WHEN = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const sharedLabel = (iso: string) => WHEN.format(new Date(iso));

export default function Session() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const { session, loading } = useSession(params.id);
  const { notes, loading: notesLoading } = useSessionNotes(params.id);
  const { me } = useMe();
  const clients = useClients();
  const { alerts } = useTherapistAlerts(false);
  const [callError, setCallError] = useState<string | null>(null);
  const lastTime = useLastSuggestions(session?.child_id, session?.start_time);

  if (!session) {
    return (
      <Screen backdrop="brand" header={<Header title="Session" left="close" getHelp={false} fallback="/therapist/calendar" />}>
        <Card tone="raised" padding={space.lg}>
          <T v="bodyLg" color="textSecondary">
            {loading ? 'Loading…' : 'This session isn’t on your calendar any more.'}
          </T>
        </Card>
      </Screen>
    );
  }

  const name = session.child_name ?? 'this child';
  const client = clients.find((cl) => cl.id === session.child_id);
  const parentName = client?.parent || null;
  const parentFirst = client?.parentFirst || 'the family';
  const video = session.meeting_kind === 'video';
  const date = localDateIso(new Date(session.start_time));
  const start = localStartMinutes(new Date(session.start_time));
  const end = localStartMinutes(new Date(session.end_time));
  const upcoming = session.status === 'booked' && new Date(session.start_time).getTime() > Date.now();
  const written = hasNotes(notes);
  const clinic = me?.clinic ?? null;
  // Alerts about this child that the family has not dealt with yet.
  const openAlerts = alerts.filter((a) => a.child_id === session.child_id && !a.parent_seen_at);

  const join = async () => {
    setCallError(null);
    const error = await joinCall(session.id);
    if (error) setCallError(error);
  };

  const footer = session.status === 'cancelled' ? (
    <Card tone="raised" padding={space.lg}>
      <T v="bodyLg" color="textSecondary">
        This session was cancelled.
      </T>
    </Card>
  ) : upcoming ? (
    video ? (
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="clock" size={16} color={c.textMuted} />
          <T v="bodySm" color="textSecondary" style={{ flex: 1 }} accessibilityLiveRegion="polite">
            {callError ?? `The join link opens at ${timeLabel(start - 10)}.`}
          </T>
        </View>
        <Button title="Join video call" iconLeft="video" disabled={!callIsOpen(session.start_time, session.end_time)} onPress={join} />
      </View>
    ) : (
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="map-pin" size={16} color={c.textMuted} />
          <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>
            In person · {clinic ? `${clinic.name} clinic, ${clinic.address}` : 'at the clinic'}
          </T>
        </View>
        <Button
          title={`Open ${name}’s page`}
          variant="outline"
          icon="arrow-right"
          onPress={() => router.push(`/therapist/client?id=${session.child_id}` as Href)}
        />
      </View>
    )
  ) : (
    <Button
      title={notes?.shared_at ? 'Edit notes' : written ? 'Keep writing' : 'Write notes'}
      icon={notes?.shared_at ? 'edit-2' : 'arrow-right'}
      onPress={() => router.push(`/therapist/notes?session=${session.id}` as Href)}
    />
  );

  return (
    <Screen backdrop="brand" header={<Header title="Session" left="close" getHelp={false} fallback="/therapist/calendar" />} footer={footer}>
      <Appear>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <Avatar initials={name.charAt(0)} size={64} tone="brand" />
            <View style={{ flex: 1, gap: space.xs }}>
              <Badge label={video ? 'VIDEO CALL' : 'IN PERSON'} tone="info" />
              <T v="heading" header>
                Session with {name}
              </T>
              <T v="bodySm" color="textMuted">
                {dayLabel(date)} · {rangeLabel(start, end)}
              </T>
              {parentName ? (
                <T v="bodySm" color="textMuted">
                  Parent: {parentName}
                </T>
              ) : null}
            </View>
          </View>
        </Card>
      </Appear>

      {upcoming ? (
        <Stagger>
          <View style={{ gap: space.md }}>
            <SectionHeader title="Before the session" />
            <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
              <Fact label="Alerts">
                {openAlerts.length
                  ? `${openAlerts.length} ${openAlerts.length === 1 ? 'alert' : 'alerts'} ${parentFirst} hasn’t seen yet`
                  : 'None'}
              </Fact>
              <Fact label={`What ${parentFirst} shared`} last>
                {/* Sharing a week is not built on the server yet, so say that plainly. */}
                Check-ins and summaries will show here once families can share them.
              </Fact>
            </Card>
          </View>
          {lastTime?.length ? (
            <View style={{ gap: space.md }}>
              <SectionHeader title="Things to try at home (last time)" />
              <TryAtHome items={lastTime} />
            </View>
          ) : null}
        </Stagger>
      ) : notesLoading ? (
        <Card tone="raised" padding={space.lg}>
          <T v="body" color="textMuted">
            Loading…
          </T>
        </Card>
      ) : written && notes ? (
        <NotesPreview notes={asNotesView(notes, sharedLabel)} parentFirst={parentFirst} name={name} />
      ) : (
        <Card tone="raised" r={24} padding={space.xl}>
          <View style={{ gap: space.sm }}>
            <T v="heading">No notes yet</T>
            <T v="body" color="textSecondary">
              Write what {parentFirst} should know, and your own working notes. {parentFirst} only sees the part you share.
            </T>
          </View>
        </Card>
      )}
    </Screen>
  );
}
