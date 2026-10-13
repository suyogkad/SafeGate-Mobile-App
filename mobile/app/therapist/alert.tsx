/**
 * T09 Client alert: the therapist's view of one safety alert. The title and time, a facts
 * card (the level, what happened, what the child sees now, what the parent has done),
 * what the therapist can do, and the emergency section set apart.
 *
 * Three things this screen deliberately does not do:
 *  - it never shows what the child wrote. The alert says what happened, not what was
 *    said, and a therapist only reads a conversation if the family shares it (rule 19).
 *  - "I've seen this" is the parent's action. The therapist taps "Noted", which clears
 *    their own list and tells nobody -- the child's screen must keep meaning what it says.
 *  - it never contacts emergency services itself.
 * ?id=<alert id>
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ActionRow, Fact } from '@/components/AlertParts';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Badge } from '@/components/ui/Badge';
import { Divider, SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { noteAlert } from '@/api/therapist';
import { EMERGENCY_NOTE_SHORT, helpline } from '@/data/helplines';
import { callNumber, contact } from '@/lib/call';
import { useClients, useTherapistAlerts } from '@/lib/clients';
import { clockOf } from '@/lib/time';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const DATE = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** "Tuesday, 6 October at 10:36 pm" -- the day matters as much as the time here. */
const when = (iso: string) => `${DATE.format(new Date(iso))} at ${clockOf(iso)}`;

export default function TherapistAlert() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const { alerts, reload } = useTherapistAlerts(false);
  const clients = useClients();
  const [noting, setNoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alert = alerts.find((a) => a.id === params.id);

  if (!alert) {
    return (
      <Screen backdrop="brand" header={<Header left="close" getHelp={false} fallback="/therapist/today" />}>
        <Card padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name="check-circle" size={22} color={c.onSuccessTint} />
            <T v="bodyLg" color="textSecondary" style={{ flex: 1 }}>
              {alerts.length === 0 ? 'Nothing needs you right now' : 'This alert is no longer in your list.'}
            </T>
          </View>
        </Card>
      </Screen>
    );
  }

  const name = alert.child_name ?? 'This child';
  const client = clients.find((cl) => cl.id === alert.child_id);
  const parentName = client?.parent || null;
  const parentFirst = client?.parentFirst || 'The family';
  const urgent = alert.level === 'urgent';
  const n000 = helpline('000');

  const parentDid = alert.parent_seen_at
    ? `${parentFirst} saw this at ${clockOf(alert.parent_seen_at)} and will reach out to ${name}.`
    : urgent
      ? `Not seen yet. ${parentFirst} has been told.`
      : `${parentFirst} is not told about this level. It came to you.`;

  const note = async () => {
    setNoting(true);
    try {
      await noteAlert(alert.id);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark this as noted.');
    } finally {
      setNoting(false);
    }
  };

  return (
    <Screen header={<Header left="close" getHelp={false} fallback="/therapist/today" />}>
      <View style={{ gap: space.xs }}>
        <T v="title" header>
          {name}’s app switched to calm steps
        </T>
        <T v="bodyLg" color="textMuted">
          {when(alert.timestamp)}
        </T>
      </View>

      <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
        <Fact label="Concern">
          {/* The level is for adults only: the child's app never shows it (rule 5). */}
          <Badge label={urgent ? 'High' : 'Medium'} tone={urgent ? 'warn' : 'neutral'} />
        </Fact>
        <Fact label="What happened">
          {urgent
            ? `${name} wrote something that may mean they are not safe.`
            : `${name} wrote something that may mean they are struggling.`}
        </Fact>
        <Fact label={`What ${name} sees now`}>
          Calm steps and phone numbers for help, and that a grown-up who looks after them has been told.
        </Fact>
        <Fact label={`What ${parentFirst} has done`} last>
          {parentDid}
        </Fact>
      </Card>

      <View style={{ gap: space.xs }}>
        <SectionHeader title="What you can do now" />
        {parentName ? (
          <>
            <ActionRow
              icon="send"
              title={`Message ${parentFirst}`}
              sub={parentName}
              action="Message"
              label={`Message ${parentName}`}
              onPress={() => contact('message', parentName)}
            />
            <Divider />
          </>
        ) : null}
        <ActionRow
          icon="user"
          title={`Open ${name}’s page`}
          sub="Goals, sessions and what the family shared"
          action="Open"
          label={`Open ${name}'s page`}
          onPress={() => router.push(`/therapist/client?id=${alert.child_id}` as Href)}
        />
        <Divider />
        {/* The therapist does not get the child's words. The family reads the chat,
            and shares one if they choose to (rule 19). */}
        <View style={{ flexDirection: 'row', gap: space.sm, paddingVertical: space.md }}>
          <Icon name="lock" size={18} color={c.textMuted} />
          <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>
            You don’t see what {name} wrote. {parentFirst} reads the chat, and can share one with you.
          </T>
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        {alert.noted_at ? (
          <Appear>
            <Card tone="surface" padding={space.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }} accessibilityLiveRegion="polite">
                <Icon name="check-circle" size={22} color={c.onSuccessTint} />
                <T v="bodyLg" style={{ flex: 1 }}>
                  You’ve noted this. It’s still in {name}’s alerts.
                </T>
              </View>
            </Card>
          </Appear>
        ) : (
          <>
            <Button title="Noted" icon="check" disabled={noting} onPress={note} />
            <T v="bodySm" color="textMuted" accessibilityLiveRegion="polite">
              {error ?? `Only for your list. ${parentFirst} and ${name} aren’t told.`}
            </T>
          </>
        )}
      </View>

      {/* Set apart: emergency. The therapist can call 000 too; contacting emergency
          services for the family is the parent's step, and SafeGate never calls. */}
      <Card tone="help" padding={space.lg} style={{ marginTop: space.lg }}>
        <View style={{ gap: space.md }}>
          <T v="heading" tint={c.onHelpTint}>
            If {name} is in danger right now, call 000.
          </T>
          <Button title="Call 000" variant="help" iconLeft="phone" label="Call 000, emergency services" onPress={() => callNumber(n000.number, 'emergency services')} />
          <T v="bodySm" tint={c.onHelpTint}>
            {EMERGENCY_NOTE_SHORT}
          </T>
        </View>
      </Card>
    </Screen>
  );
}
