/**
 * P15 Alert (+ P16 Contact emergency services confirm). The most important parent screen:
 * clear, calm, no alarm red, obvious next actions. Facts, action rows, "I've seen this", and
 * the emergency section set apart at the bottom behind a confirm.
 *
 * Three things hold this screen together:
 *  - "What <child> sees now" quotes `calmLeadFor()`, the same function the child's calm
 *    screen uses, so the two sides cannot drift apart (rule 12).
 *  - "I've seen this" is a server action. It is what lets the child's screen say someone
 *    who looks after them has seen it, so that sentence stays true.
 *  - **SafeGate contacts nobody.** "Contact emergency services" records who asked and when
 *    (rule 17) and tells the parent to call 000 themselves.
 *
 * ?id=<alert id> (defaults to the newest alert nobody has seen yet), or ?kind=help.
 */
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ActionRow, Fact } from '@/components/AlertParts';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Divider, SectionHeader } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { EMERGENCY_NOTE_SHORT, helpline } from '@/data/helplines';
import { callNumber, contact } from '@/lib/call';
import { calmLeadFor } from '@/lib/calmLead';
import { useChildAlerts, useMyChild } from '@/lib/family';
import { clockTime, clockOf } from '@/lib/time';
import { useApp } from '@/store/app';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const DATE = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** "Tuesday, 6 October at 10:36 pm" -- the day matters as much as the time here. */
const when = (iso: string) => `${DATE.format(new Date(iso))} at ${clockOf(iso)}`;

export default function Alert() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const child = useMyChild();
  const { alerts, open, loading, acknowledge, askEmergencyServices } = useChildAlerts(child?.id);

  const account = useApp((s) => s.account);
  // A child tapping "Let <parent> know" in Get help is still local: the child app's
  // Get help screen has no endpoint yet. The calm branch below is the real one.
  const helpRequest = useApp((s) => s.helpRequest);
  const helpRequestAt = useApp((s) => s.helpRequestAt);
  const helpSeen = useApp((s) => s.helpSeen);

  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = child?.full_name || 'your child';
  const parentName = account?.name || 'you';
  const parentFirstName = account?.name ? account.name.split(' ')[0] : 'your grown-up';
  const n000 = helpline('000');

  const alert = params.id ? alerts.find((a) => a.id === params.id) : (open[0] ?? alerts[0]);
  const showHelp = params.kind === 'help' && !!helpRequest;

  if (!alert && !showHelp) {
    return (
      <Screen header={<Header left="close" getHelp={false} fallback="/parent/home" />}>
        <Card padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name="check-circle" size={22} color={c.onSuccessTint} />
            <T v="bodyLg" color="textSecondary">
              {loading ? 'Loading…' : 'Nothing needs you right now'}
            </T>
          </View>
        </Card>
      </Screen>
    );
  }

  // ---- The help-request version (still local) ----------------------------
  if (showHelp) {
    return (
      <Screen header={<Header left="close" getHelp={false} fallback="/parent/home" />}>
        <View style={{ gap: space.xs }}>
          <T v="title" header>
            {name} asked for you: “{helpRequest}”
          </T>
          <T v="bodyLg" color="textMuted">
            Today, {helpRequestAt ?? ''}
          </T>
        </View>
        <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
          <Fact label="What happened">
            {`${name} tapped “Let ${parentFirstName} know” on “${helpRequest}” in Get help.`}
          </Fact>
          <Fact label={`What ${name} sees now`} last>
            A note that you have been told, and phone numbers for help.
          </Fact>
        </Card>
        <View style={{ gap: space.xs }}>
          <SectionHeader title="What you can do now" />
          <ActionRow icon="phone" title={`Call ${name}`} action="Call" label={`Call ${name}`} onPress={() => contact('call', name)} />
          <Divider />
          <ActionRow
            icon="message-square"
            title="Read the chats"
            action="Read"
            label="Read the chats"
            onPress={() => router.push('/parent/chats')}
          />
        </View>
        {helpSeen ? (
          <Appear>
            <Card tone="surface" padding={space.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }} accessibilityLiveRegion="polite">
                <Icon name="check-circle" size={22} color={c.onSuccessTint} />
                <T v="bodyLg" style={{ flex: 1 }}>
                  You’ve marked this as seen.
                </T>
              </View>
            </Card>
          </Appear>
        ) : (
          <Button title="I've seen this" icon="check" onPress={() => useApp.getState().ackHelp()} />
        )}
      </Screen>
    );
  }

  // ---- The real thing ----------------------------------------------------
  const a = alert!;
  const urgent = a.level === 'urgent';
  const seen = !!a.acknowledged_at;
  const emergency = !!a.emergency_requested_at;
  // Exactly what the child's screen is showing right now.
  const childLine = calmLeadFor({
    active: true,
    seen_by_grown_up: seen,
    emergency_requested: emergency,
  });

  const markSeen = async () => {
    setBusy(true);
    setError(await acknowledge(a.id));
    setBusy(false);
  };

  const confirmEmergency = async () => {
    setBusy(true);
    const failed = await askEmergencyServices(a.id);
    setBusy(false);
    setConfirm(false);
    setError(failed);
  };

  return (
    <Screen header={<Header left="close" getHelp={false} fallback="/parent/home" />}>
      <View style={{ gap: space.xs }}>
        <T v="title" header>
          {name}’s app switched to calm steps
        </T>
        <T v="bodyLg" color="textMuted">
          {when(a.timestamp)}
        </T>
      </View>

      <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
        <Fact label="Concern">
          {/* Parent only. The child's app is never told a level (rule 5). */}
          <Badge label={urgent ? 'High' : 'Medium'} tone={urgent ? 'warn' : 'neutral'} />
        </Fact>
        <Fact label="What happened">
          {urgent
            ? `${name} wrote something that may mean they are not safe.`
            : `${name} wrote something that may mean they are struggling.`}
        </Fact>
        <Fact label={`What ${name} sees now`} last={!a.also_told}>
          {`Calm steps and phone numbers for help, with: “${childLine}”`}
        </Fact>
        {a.also_told ? <Fact label="Also told" last>{a.also_told}</Fact> : null}
      </Card>

      <View style={{ gap: space.xs }}>
        <SectionHeader title="What you can do now" />
        <ActionRow icon="phone" title={`Call ${name}`} action="Call" label={`Call ${name}`} onPress={() => contact('call', name)} />
        <Divider />
        <ActionRow
          icon="message-square"
          title="Read the conversation"
          sub={`${name} knows you can read this`}
          action="Read"
          label="Read the conversation"
          onPress={() => router.push('/parent/chats')}
        />
        {a.also_told ? (
          <>
            <Divider />
            <ActionRow
              icon="send"
              title={`Message ${a.also_told.split(',')[0].split(' ')[0]}`}
              sub={`Told at ${clockOf(a.timestamp)}`}
              action="Message"
              label={`Message ${a.also_told.split(',')[0]}`}
              onPress={() => contact('message', a.also_told!.split(',')[0])}
            />
          </>
        ) : null}
      </View>

      <View style={{ gap: space.sm }}>
        {seen ? (
          <Appear>
            <Card tone="surface" padding={space.lg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }} accessibilityLiveRegion="polite">
                <Icon name="check-circle" size={22} color={c.onSuccessTint} />
                <T v="bodyLg" style={{ flex: 1 }}>
                  You’ve marked this as seen
                  {a.acknowledged_at ? ` at ${clockOf(a.acknowledged_at)}` : ''}.
                </T>
              </View>
            </Card>
          </Appear>
        ) : (
          <Button title="I've seen this" icon="check" disabled={busy} onPress={markSeen} />
        )}
        {error ? (
          <T v="bodySm" color="onWarnTint" accessibilityLiveRegion="polite">
            {error}
          </T>
        ) : !seen && !emergency ? (
          <T v="bodySm" color="textMuted">
            Then {name} will see: “Someone who looks after you has seen this and will reach out.”
          </T>
        ) : null}
      </View>

      {/* Set apart: emergency. Never automatic, never one tap. */}
      <Card tone="help" padding={space.lg} style={{ marginTop: space.lg }}>
        <View style={{ gap: space.md }}>
          <T v="heading" tint={c.onHelpTint}>
            If {name} is in danger right now, call 000.
          </T>
          <Button title="Call 000" variant="help" iconLeft="phone" label="Call 000, emergency services" onPress={() => callNumber(n000.number, 'emergency services')} />
          <T v="bodySm" tint={c.onHelpTint}>
            {EMERGENCY_NOTE_SHORT}
          </T>
          {emergency ? (
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }} accessibilityLiveRegion="polite">
              <Icon name="check-circle" size={20} color={c.onHelpTint} />
              <T v="bodySm" tint={c.onHelpTint} style={{ flex: 1 }}>
                Recorded: {a.emergency_requested_by_name ?? parentName} asked for emergency services to help {name} at{' '}
                {a.emergency_requested_at ? clockOf(a.emergency_requested_at) : ''}. {name} has been told
                plainly what is happening.
              </T>
            </View>
          ) : (
            <Button
              title={`Contact emergency services about ${name}…`}
              variant="text"
              onTint
              label={`Contact emergency services about ${name}. Opens a confirmation.`}
              onPress={() => setConfirm(true)}
            />
          )}
        </View>
      </Card>

      {/* P16 — names who is asking and when. SafeGate contacts nobody. */}
      <Dialog visible={confirm} onClose={() => setConfirm(false)} title={`Contact emergency services about ${name}?`}>
        <T v="body" color="textSecondary" center>
          Only do this if {name} is in danger right now. SafeGate will record that you, {parentName}, asked for this at{' '}
          {clockTime()}. {name} will be told plainly what is happening.
        </T>
        <T v="bodySm" color="textMuted" center>
          SafeGate is not an emergency service. You can also call 000 yourself.
        </T>
        <Button title="Yes, contact them" disabled={busy} onPress={confirmEmergency} />
        <Button title="Not now" variant="outline" onPress={() => setConfirm(false)} />
        <Button
          title="Call 000 instead"
          variant="text"
          style={{ alignSelf: 'center' }}
          onPress={() => {
            setConfirm(false);
            callNumber(n000.number, 'emergency services');
          }}
        />
      </Dialog>
    </Screen>
  );
}
