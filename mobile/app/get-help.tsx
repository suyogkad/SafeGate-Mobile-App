/**
 * C25 Get help, in the help colour. The 000 headline and button, "Your people" rows (initials + small buttons),
 * helpline cards (number, "Checked" date, Call / Text / Chat), "Not sure what to do?" topic chips, help background.
 * No [GH] here (this is it). No red, SOS, map, hold-to-call or countdown. Every call/text/chat is a demo alert.
 * Message Priya opens a message box: it says the grown-up can read it (rule 3) and that messages aren't for
 * emergencies, then confirms "Message sent". The therapist is told (their notifications).
 */
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { EmergencyNote } from '@/components/EmergencyNote';
import { Header } from '@/components/Header';
import { HelplineCard } from '@/components/HelplineCard';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Avatar } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Divider } from '@/components/ui/bits';
import { Icon, type IconName } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { ART } from '@/data/faces';
import { HELP_TOPICS } from '@/data/helpTopics';
import { HELPLINES, helpline } from '@/data/helplines';
import { callNumber, contact } from '@/lib/call';
import { useApp, useGrownUpName, useTherapistFirstName } from '@/store/app';
import { radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const TOPIC_ICON: Record<string, IconName> = { unsafe: 'shield', hurting: 'user', scared: 'cloud', hurts: 'plus-circle' };

export default function GetHelp() {
  const { c } = useTheme();
  const grownUp = useGrownUpName();
  const therapistName = useTherapistFirstName();
  const n000 = helpline('000');
  const lines = HELPLINES.filter((h) => h.id !== '000');
  const [messaging, setMessaging] = useState(false);
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const openMessage = () => {
    setDraft('');
    setSent(false);
    setError(false);
    setMessaging(true);
  };
  const sendMessage = () => {
    if (!draft.trim()) return setError(true);
    // TODO(safegate): a real build sends this to the therapist (and it's visible to the grown-up).
    useApp.getState().messageTherapist(draft.trim());
    setSent(true);
  };

  return (
    <Screen backdrop="help" header={<Header title="Get help" getHelp={false} fallback="/home" />}>
      {/* Emergency first: warm, clear, never alarm-red. */}
      <Appear>
        <View style={{ backgroundColor: c.bg, borderRadius: radius.panel, padding: space.xl, overflow: 'hidden', ...shadow.lift }}>
          <Image
            source={ART.cheer}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ position: 'absolute', right: -18, top: -6, width: 118, height: 118 }}
          />
          <View style={{ gap: space.lg }}>
            <T v="title" header style={{ paddingRight: 92 }}>
              If you are in danger right now, call 000.
            </T>
            <Button title="Call 000" variant="help" iconLeft="phone" label="Call 000, emergency services" onPress={() => callNumber(n000.number, 'emergency services')} />
          </View>
        </View>
      </Appear>

      <View style={{ gap: space.md }}>
        <T v="section" header>
          Your people
        </T>
        <Card tone="raised" padding={space.lg}>
          <PersonRow initials={grownUp.charAt(0).toUpperCase()} name={grownUp} role="Your grown-up">
            <Button title="Call" size="small" iconLeft="phone" label={`Call ${grownUp}`} onPress={() => contact('call', grownUp)} />
            <Button title="Text" size="small" variant="outline" label={`Text ${grownUp}`} onPress={() => contact('text', grownUp)} />
          </PersonRow>
          <View style={{ marginVertical: space.md }}>
            <Divider />
          </View>
          <PersonRow initials={therapistName.charAt(0).toUpperCase()} name={therapistName} role="Your therapist">
            <Button title="Message" size="small" variant="outline" iconLeft="send" label={`Message ${therapistName}`} onPress={openMessage} />
          </PersonRow>
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <T v="section" header>
          Other people you can talk to
        </T>
        {lines.map((h) => (
          <HelplineCard key={h.id} h={h} />
        ))}
      </View>

      <View style={{ gap: space.md }}>
        <T v="section" header>
          Not sure what to do?
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {HELP_TOPICS.map((t) => (
            <Tappable
              key={t.id}
              label={t.chip}
              onPress={() => router.push(`/help-topic?id=${t.id}` as Href)}
              style={{ width: '48.5%', minHeight: 88, backgroundColor: c.bg, borderRadius: radius.card, padding: space.md, gap: space.sm, ...shadow.lift }}
            >
              <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: c.helpTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={TOPIC_ICON[t.id]} size={18} color={c.onHelpTint} />
              </View>
              <T v="bodySmMedium">{t.chip}</T>
            </Tappable>
          ))}
        </View>
      </View>

      <EmergencyNote short />

      <Dialog visible={messaging} onClose={() => setMessaging(false)} title={sent ? 'Message sent' : `Message ${therapistName}`}>
        {sent ? (
          <>
            <View style={{ alignItems: 'center' }} accessibilityLiveRegion="polite">
              <View style={{ width: 64, height: 64, borderRadius: radius.pill, backgroundColor: c.successTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={30} color={c.onSuccessTint} />
              </View>
            </View>
            <T v="body" color="textSecondary" center>
              {therapistName} reads messages between sessions. If you need help right now, call 000 or a helpline.
            </T>
            <Button title="Done" onPress={() => setMessaging(false)} />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon name="eye" size={16} color={c.textSecondary} />
              <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>
                Your grown-up can read what you write here.
              </T>
            </View>
            <Input
              area
              multiline
              a11yLabel={`Message to ${therapistName}`}
              placeholder="Write your message"
              value={draft}
              onChangeText={(v) => {
                setDraft(v);
                setError(false);
              }}
              style={{ minHeight: 110 }}
            />
            {error ? (
              <T v="bodySm" color="textSecondary" accessibilityLiveRegion="polite">
                Write a few words first.
              </T>
            ) : null}
            <T v="bodySm" color="textMuted">
              Messages aren’t for emergencies. {therapistName} reads them between sessions.
            </T>
            <Button title="Send" icon="send" onPress={sendMessage} />
            <Button title="Cancel" variant="outline" onPress={() => setMessaging(false)} />
          </>
        )}
      </Dialog>
    </Screen>
  );
}

function PersonRow({ initials, name, role, children }: { initials: string; name: string; role: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md }}>
      <Avatar initials={initials} size={48} />
      <View style={{ flex: 1, gap: space.sm }}>
        <View>
          <T v="section">{name}</T>
          <T v="bodySm" color="textMuted">
            {role}
          </T>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{children}</View>
      </View>
    </View>
  );
}
