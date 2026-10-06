/**
 * P15 Alert (+ P16 Contact emergency services confirm). The most important parent screen:
 * clear, calm, no alarm red, obvious next actions. A facts list, action rows, "I've seen this", and the emergency
 * section set apart at the bottom (contacting emergency services is behind a confirm dialog).
 * ?kind=calm (calm mode) or ?kind=help ("Let Jordan know"). Defaults to whichever is live.
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
import { calmLead } from '@/lib/calmLead';
import { clockTime } from '@/lib/time';
import { useApp, useChildName, useTherapistFirstName, useTherapistFullName } from '@/store/app';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Alert() {
  const { c } = useTheme();
  const name = useChildName() || 'Alex';
  const therapistFirst = useTherapistFirstName();
  const therapistFull = useTherapistFullName();
  const params = useLocalSearchParams<{ kind?: string }>();
  const account = useApp((s) => s.account);
  const parentName = account?.name || 'Parent';
  const parentFirstName = account?.name ? account.name.split(' ')[0] : 'your grown-up';
  const calmMode = useApp((s) => s.calmMode);
  const calmAt = useApp((s) => s.calmAt);
  const helpRequest = useApp((s) => s.helpRequest);
  const helpRequestAt = useApp((s) => s.helpRequestAt);
  const helpSeen = useApp((s) => s.helpSeen);
  const emergency = useApp((s) => s.emergency);
  const [confirm, setConfirm] = useState(false);

  const kind: 'calm' | 'help' | null =
    params.kind === 'help' && helpRequest ? 'help' : params.kind === 'calm' && calmMode !== 'off' ? 'calm' : calmMode !== 'off' ? 'calm' : helpRequest ? 'help' : null;

  if (!kind) {
    return (
      <Screen header={<Header left="close" getHelp={false} fallback="/parent/home" />}>
        <Card padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name="check-circle" size={22} color={c.onSuccessTint} />
            <T v="bodyLg" color="textSecondary">
              Nothing needs you right now
            </T>
          </View>
        </Card>
      </Screen>
    );
  }

  const calm = kind === 'calm';
  const seen = calm ? calmMode === 'seen' : helpSeen;
  const time = (calm ? calmAt : helpRequestAt) ?? '';
  const title = calm ? `${name}'s app switched to calm steps` : `${name} asked for you: “${helpRequest}”`;
  const n000 = helpline('000');

  return (
    <Screen header={<Header left="close" getHelp={false} fallback="/parent/home" />}>
      <View style={{ gap: space.xs }}>
        <T v="title" header>
          {title}
        </T>
        <T v="bodyLg" color="textMuted">
          Today, {time}
        </T>
      </View>

      <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
        {calm ? (
          <Fact label="Concern">
            <Badge label="High" tone="warn" />
          </Fact>
        ) : null}
        <Fact label="What happened">
          {calm ? `${name} wrote something that may mean they are not safe.` : `${name} tapped “Let ${parentFirstName} know” on “${helpRequest}” in Get help.`}
        </Fact>
        <Fact label={`What ${name} sees now`} last={!calm}>
          {calm
            ? // The same line the child's calm screen shows right now, so this never drifts from the truth.
              `Calm steps and phone numbers for help, with: “${calmLead(calmMode, emergency)}”`
            : `A note that you have been told, and phone numbers for help.`}
        </Fact>
        {calm ? (
          <Fact label="Also told" last>
            {`${therapistFull}, ${name}'s therapist`}
          </Fact>
        ) : null}
      </Card>

      <View style={{ gap: space.xs }}>
        <SectionHeader title="What you can do now" />
        <ActionRow icon="phone" title={`Call ${name}`} action="Call" label={`Call ${name}`} onPress={() => contact('call', name)} />
        <Divider />
        <ActionRow
          icon="message-square"
          title="Read the conversation"
          action="Read"
          label="Read the conversation"
          onPress={() => router.push(calm ? '/parent/transcript?id=live' : '/parent/chats')}
        />
        <Divider />
        <ActionRow
          icon="send"
          title={`Message ${therapistFirst}`}
          sub={calm ? `Therapist notified at ${time}` : undefined}
          action="Message"
          label={`Message ${therapistFull}`}
          onPress={() => contact('message', therapistFull)}
        />
      </View>

      <View style={{ gap: space.sm }}>
        {seen ? (
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
          <Button title="I've seen this" icon="check" onPress={() => (calm ? useApp.getState().setCalmMode('seen') : useApp.getState().ackHelp())} />
        )}
        {calm && !seen && !emergency ? (
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
                Recorded: {emergency.by} asked for emergency services to help {name} at {emergency.at}. {name} has been told plainly what is happening.
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

      {/* P16 — confirm dialog: names who is asking and when. Nothing is actually contacted in the demo. */}
      <Dialog visible={confirm} onClose={() => setConfirm(false)} title={`Contact emergency services about ${name}?`}>
        <T v="body" color="textSecondary" center>
          Only do this if {name} is in danger right now. SafeGate will record that you, {parentName}, asked for this at {clockTime()}. {name} will be told
          plainly what is happening.
        </T>
        <T v="bodySm" color="textMuted" center>
          SafeGate is not an emergency service. You can also call 000 yourself.
        </T>
        <Button
          title="Yes, contact them"
          onPress={() => {
            // TODO(safegate): a real build sends this to the escalation service. The demo only records who and when.
            useApp.getState().requestEmergency(parentName);
            setConfirm(false);
          }}
        />
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
