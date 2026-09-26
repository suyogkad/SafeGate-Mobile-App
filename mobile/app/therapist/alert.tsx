/**
 * T09 Client alert. The therapist's copy of the parent's Alert, made of the same parts: the title and time, a
 * facts card (Concern: High is allowed here, never in the child app; what happened; what Alex sees now, from the
 * same calmLead() line as the calm screen; what Jordan has done), action rows (Message Jordan, Read the
 * conversation), and the emergency section set apart (Call 000 + "SafeGate is not an emergency service").
 * "I've seen this" is the parent's action; the therapist taps "Noted", which only clears their own list.
 * ?id=calm
 */
import { router } from 'expo-router';
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
import { EMERGENCY_NOTE_SHORT, helpline } from '@/data/helplines';
import { CLIENTS } from '@/data/practice';
import { callNumber, contact } from '@/lib/call';
import { calmLead } from '@/lib/calmLead';
import { isOpenUrgent, useApp, useChildName } from '@/store/app';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function TherapistAlert() {
  const { c } = useTheme();
  const name = useChildName();
  const calmMode = useApp((s) => s.calmMode);
  const calmAt = useApp((s) => s.calmAt);
  const calmSeenAt = useApp((s) => s.calmSeenAt);
  const emergency = useApp((s) => s.emergency);
  const notifications = useApp((s) => s.notifications);
  const parent = CLIENTS.alex;
  const mine = notifications.filter((n) => n.audience === 'therapist' && (n.type === 'calm' || n.type === 'emergency'));
  const open = mine.filter(isOpenUrgent);

  if (calmMode === 'off') {
    return (
      <Screen backdrop="brand" header={<Header left="close" getHelp={false} fallback="/therapist/today" />}>
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

  const jordanDid = emergency
    ? `${emergency.by} asked emergency services to help ${name} at ${emergency.at}.`
    : calmSeenAt
      ? `${parent.parentFirst} saw this at ${calmSeenAt} and will reach out to ${name}.`
      : `Not seen yet. ${parent.parentFirst} has been told.`;
  const n000 = helpline('000');

  return (
    <Screen header={<Header left="close" getHelp={false} fallback="/therapist/today" />}>
      <View style={{ gap: space.xs }}>
        <T v="title" header>
          {name}’s app switched to calm steps
        </T>
        <T v="bodyLg" color="textMuted">
          Today, {calmAt ?? ''}
        </T>
      </View>

      <Card tone="outlined" padding={space.lg} style={{ paddingVertical: space.xs }}>
        <Fact label="Concern">
          <Badge label="High" tone="warn" />
        </Fact>
        <Fact label="What happened">{`${name} wrote something that may mean they are not safe.`}</Fact>
        <Fact label={`What ${name} sees now`}>{`Calm steps and phone numbers for help, with: “${calmLead(calmMode, emergency)}”`}</Fact>
        <Fact label={`What ${parent.parentFirst} has done`} last>
          {jordanDid}
        </Fact>
      </Card>

      <View style={{ gap: space.xs }}>
        <SectionHeader title="What you can do now" />
        <ActionRow icon="send" title={`Message ${parent.parentFirst}`} sub={parent.parent} action="Message" label={`Message ${parent.parent}`} onPress={() => contact('message', parent.parent)} />
        <Divider />
        <ActionRow
          icon="message-square"
          title="Read the conversation"
          sub={`As ${parent.parentFirst} sees it`}
          action="Read"
          label="Read the conversation"
          onPress={() => router.push('/parent/transcript?id=live')}
        />
      </View>

      <View style={{ gap: space.sm }}>
        {open.length ? (
          <>
            <Button title="Noted" icon="check" onPress={() => open.forEach((n) => useApp.getState().resolveNotification(n.id))} />
            <T v="bodySm" color="textMuted">
              Only for your list. {parent.parentFirst} and {name} aren’t told.
            </T>
          </>
        ) : (
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
        )}
      </View>

      {/* Set apart: emergency. The therapist can call 000 too; contacting emergency services for the family is the parent's step. */}
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
