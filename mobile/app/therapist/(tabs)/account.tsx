/**
 * T11 Therapist Account (tab root). The parent's Account layout: a navy "Practitioner" panel with the therapist's photo
 * (no character: the therapist side keeps illustrations to a minimum), grouped rows in raised
 * cards for Your practice, "What we tell you about" and Help, and a text button to sign out (→ Welcome).
 * "Your profile" opens the profile editor (T11a). "Needs attention" (calm-step alerts,
 * emergency) is always on and has no switch.
 */
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { NavyPanel } from '@/components/NavyPanel';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Avatar } from '@/components/ui/bits';
import { initialsOf } from '@/lib/time';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { SwitchRow } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { PRACTITIONER } from '@/data/practice';
import { signOutEverywhere } from '@/lib/auth';
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

export default function TherapistAccount() {
  const { c } = useTheme();
  const account = useApp((s) => s.account);
  const prefs = useApp((s) => s.therapistPrefs);
  const setPref = useApp((s) => s.setTherapistPref);

  return (
    <Screen inTabs backdrop="brand" header={<Header title="Account" left="none" getHelp={false} />}>
      <Stagger>
        <NavyPanel
          caption="PRACTITIONER"
          title={account?.name || 'Your practice'}
          lead={<Avatar initials={initialsOf(account?.name)} size={72} />}
        >
          <T v="bodyLg" color="onBrand" style={{ opacity: 0.9 }}>
            {account?.email || 'Signed in'}
          </T>
        </NavyPanel>

        <Section title="Your practice">
          <ListRow
            title="Your profile"
            subtitle="Edit what families see when they book"
            icon="user"
            chevron
            divider
            onPress={() => router.push('/therapist/profile' as Href)}
          />
          <ListRow title="My hours" subtitle="When families can book you" icon="clock" chevron divider onPress={() => router.push('/therapist/availability' as Href)} />
          <ListRow title="All notifications" icon="list" chevron onPress={() => router.push('/therapist/notifications')} />
        </Section>

        <Section title="What we tell you about">
          <ListRow
            title="Needs attention"
            subtitle="Calm-step alerts from your clients. Always sent."
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
          <SwitchRow title="New bookings" on={prefs.bookings} onToggle={() => setPref('bookings', !prefs.bookings)} />
          <SwitchRow title="Families sharing their week" on={prefs.sharing} onToggle={() => setPref('sharing', !prefs.sharing)} />
          <SwitchRow
            title="Reminders to write notes"
            subtitle="The evening after a session"
            on={prefs.notesReminders}
            onToggle={() => setPref('notesReminders', !prefs.notesReminders)}
            divider={false}
          />
        </Section>

        <Section title="Help">
          <ListRow title="Help lines" icon="phone" chevron divider onPress={() => router.push('/parent/help-lines')} />
          <ListRow title="How SafeGate works" icon="info" chevron onPress={() => router.push('/about?from=parent')} />
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
