/**
 * P24 Account (tab root). A navy "Parent account" panel with an avatar, grouped rows in raised cards for Your
 * child, Alerts, "What we tell you about" and Help, and a text button to sign out. Sign out → Welcome.
 * "Needs you" (calm mode, help requests) is always on and has no switch; check-ins and journal entries are quiet
 * updates unless the parent asks to hear about each one.
 */
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { NavyPanel } from '@/components/NavyPanel';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Avatar } from '@/components/ui/bits';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EndSessions } from '@/components/EndSessions';
import { ListRow } from '@/components/ui/ListRow';
import { SwitchRow } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { Icon } from '@/components/ui/Icon';
import { FACES } from '@/data/faces';
import { demoOnly } from '@/lib/call';
import { signOutEverywhere } from '@/lib/auth';
import { useChildLinked, useMyChild, useNotifyPrefs } from '@/lib/family';
import { useApp } from '@/store/app';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <T v="section" header>
        {title}
      </T>
      <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
        {children}
      </Card>
    </View>
  );
}

export default function Account() {
  const { c } = useTheme();
  const account = useApp((s) => s.account);
  const child = useMyChild();
  const name = child?.full_name ?? '';
  const childId = child?.id ?? null;
  const therapistFull = child?.therapist_name ?? null;
  // Whether a phone is actually paired, from the backend: a flag in this app's own
  // memory would say "not linked yet" for a phone paired on another device.
  const linked = useChildLinked(child?.id);
  const { prefs, set: setPrefs } = useNotifyPrefs();

  return (
    <Screen inTabs backdrop="brand" header={<Header title="Account" left="none" getHelp={false} />}>
      <Stagger>
        <NavyPanel caption="PARENT ACCOUNT" title={account?.name || 'Parent Account'} face={FACES.crownEgg}>
          <T v="bodyLg" color="onBrand" style={{ opacity: 0.9 }}>
            {account?.email || 'Registered Parent'}
          </T>
        </NavyPanel>

        <Section title="Your child">
          {child ? (
          <ListRow
            left={<Avatar initials={(name || 'C').charAt(0).toUpperCase()} size={44} />}
            title={name || 'Child'}
            right={
              linked === null ? undefined : (
                <Badge label={linked ? 'Phone linked' : 'Not linked yet'} tone={linked ? 'success' : 'warn'} />
              )
            }
            chevron
            onPress={() => router.push((linked ? '/parent/child-comfort?from=home' : '/parent/link-child') as Href)}
            label={`${name || 'Child'}. ${linked === null ? '' : linked ? 'Phone linked' : 'Not linked yet'}. Open`}
          />
          ) : (
            <ListRow
              title="Add your child"
              subtitle="Their name is all SafeGate needs to start"
              icon="plus-circle"
              chevron
              onPress={() => router.push('/parent/link-child')}
            />
          )}
        </Section>

        {childId ? (
          <Section title={`Where ${name || 'your child'} is signed in`}>
            <EndSessions childId={childId} childName={name || 'Your child'} />
          </Section>
        ) : null}

        <Section title="Alerts">
          <ListRow title="How we reach you" value="App and text" icon="bell" divider onPress={() => demoOnly('In the real app you could choose how alerts reach you.')} />
          <ListRow
            title="Also tell"
            value={therapistFull ?? 'No therapist yet'}
            icon="user-check"
            divider
            onPress={() =>
              therapistFull
                ? demoOnly('In the real app you could choose who else is told.')
                : router.push('/parent/find-therapist')
            }
          />
          <ListRow title="All notifications" icon="list" chevron onPress={() => router.push('/parent/notifications')} />
        </Section>

        <Section title="What we tell you about">
          <ListRow
            title="Needs you"
            subtitle="Calm steps and help requests. Always sent."
            right={
              // not a link: it can't be changed, so it's muted text + a lock rather than a blue value
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <T v="bodySm" color="textMuted">
                  Always on
                </T>
                <Icon name="lock" size={16} color={c.textMuted} />
              </View>
            }
            divider
          />
          <SwitchRow
            title="Sessions and notes"
            subtitle="Bookings, reminders and notes from the therapist"
            on={prefs.sessions}
            onToggle={() => setPrefs({ sessions: !prefs.sessions })}
          />
          <SwitchRow
            title={`Tell me each time ${name || 'child'} checks in or writes`}
            subtitle="When off, these wait quietly in Notifications"
            on={prefs.each_activity}
            onToggle={() => setPrefs({ each_activity: !prefs.each_activity })}
          />
          <SwitchRow
            title={`Daily summary of ${name || 'child'}'s day`}
            subtitle="Around 7:00 pm"
            on={prefs.digest}
            onToggle={() => setPrefs({ digest: !prefs.digest })}
            divider={false}
          />
        </Section>

        <Section title="Help">
          <ListRow title="Help lines" icon="phone" chevron divider onPress={() => router.push('/parent/help-lines')} />
          <ListRow title="How SafeGate works" icon="info" chevron divider onPress={() => router.push('/about?from=parent')} />
          <ListRow title="Privacy" icon="shield" chevron onPress={() => demoOnly('In the real app this would open the privacy policy.')} />
        </Section>

        <Button
          title="Sign out"
          variant="text"
          iconLeft="log-out"
          style={{ alignSelf: 'center' }}
          onPress={async () => {
            await signOutEverywhere();
            router.replace('/welcome');
          }}
        />
      </Stagger>
    </Screen>
  );
}
