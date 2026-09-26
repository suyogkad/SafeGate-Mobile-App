/** Temporary: every primitive on one page, to check the look. Remove before the demo. */
import { useState } from 'react';
import { Image, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Header } from '@/components/Header';
import { GetHelpButton } from '@/components/GetHelpButton';
import { EmergencyNote } from '@/components/EmergencyNote';
import { CallSomeoneCard } from '@/components/CallSomeoneCard';
import { Wordmark } from '@/components/Wordmark';
import { T } from '@/components/ui/T';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { SwitchRow } from '@/components/ui/Switch';
import { Segmented } from '@/components/ui/Segmented';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Appear } from '@/components/ui/Appear';
import { Avatar, Divider, FaceCircle, ProgressBar, SectionHeader, StepDashes } from '@/components/ui/bits';
import { Icon } from '@/components/ui/Icon';
import { MOODS } from '@/data/moods';
import { ART, FACES } from '@/data/faces';
import { useApp } from '@/store/app';
import { moodColors, radius, space, type as typeScale } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <T v="caption" color="textMuted">
        {title.toUpperCase()}
      </T>
      {children}
    </View>
  );
}

export default function Components() {
  const { c } = useTheme();
  const comfort = useApp((s) => s.comfort);
  const setComfort = useApp((s) => s.setComfort);
  const [chips, setChips] = useState<string[]>(['Eating']);
  const [seg, setSeg] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [dialog, setDialog] = useState(false);
  const [sw, setSw] = useState(true);

  return (
    <Screen header={<Header title="Components" fallback="/home" />}>
      <Group title="Comfort (applies to this page)">
        <Segmented
          label="Text size"
          options={['Normal', 'Bigger', 'Biggest'] as const}
          value={comfort.textSize}
          onChange={(v) => setComfort('textSize', v)}
        />
        <SwitchRow title="Stronger colours" on={comfort.strongerColours} onToggle={() => setComfort('strongerColours', !comfort.strongerColours)} />
        <SwitchRow title="More space between letters" on={comfort.letterSpacing} onToggle={() => setComfort('letterSpacing', !comfort.letterSpacing)} />
        <SwitchRow title="Movement" on={comfort.movement} onToggle={() => setComfort('movement', !comfort.movement)} divider={false} />
      </Group>

      <Group title="Wordmark">
        <Wordmark size={54} />
        <Wordmark size={24} />
      </Group>

      <Group title="Type">
        {(Object.keys(typeScale) as (keyof typeof typeScale)[]).map((k) => (
          <T key={k} v={k}>
            {k} · Nothing here has to be done.
          </T>
        ))}
      </Group>

      <Group title="Colours">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(['primary', 'brand', 'brandSoft', 'surfaceTint', 'surface', 'chip', 'track', 'textMuted', 'text', 'help', 'helpTint'] as const).map((k) => (
            <View key={k} style={{ width: 96, gap: 4 }}>
              <View style={{ height: 40, borderRadius: radius.field, backgroundColor: c[k], borderWidth: 1, borderColor: c.border }} />
              <T v="caption" color="textMuted">
                {k}
              </T>
            </View>
          ))}
        </View>
      </Group>

      <Group title="Moods (face + word + tint)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {MOODS.map((m) => (
            <View key={m.id} style={{ alignItems: 'center', gap: space.xs, width: 96 }}>
              <FaceCircle face={m.face} tint={moodColors[m.id].tint} size={72} />
              <T v="bodySmMedium" tint={moodColors[m.id].word}>
                {m.label}
              </T>
            </View>
          ))}
        </View>
      </Group>

      <Group title="Buttons">
        <Button title="Continue" icon="arrow-right" />
        <Button title="Continue" disabled />
        <Button title="Talk about it" variant="outline" />
        <Button title="Call 000" variant="help" iconLeft="phone" />
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button title="Today’s idea" size="small" icon="arrow-right" />
          <Button title="Join" size="small" variant="outline" />
          <Button title="See all" variant="text" />
          <IconButton icon="image" label="Add a picture" />
          <IconButton icon="mic" label="Speak" variant="primary" />
        </View>
      </Group>

      <Group title="Get help button [GH]">
        <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
          <GetHelpButton />
          <GetHelpButton compact />
        </View>
      </Group>

      <Group title="Chips + badges">
        <ChipRow>
          {['Working', 'Driving', 'Eating', 'Gym'].map((l) => (
            <Chip key={l} label={l} multi selected={chips.includes(l)} onPress={() => setChips((s) => (s.includes(l) ? s.filter((x) => x !== l) : [...s, l]))} />
          ))}
        </ChipRow>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Badge label="CHECK IN" />
          <Badge label="NEEDS YOU" tone="warn" />
          <Badge label="SEEN" tone="neutral" />
          <Badge label="NOTES SHARED" tone="success" />
          <Badge label="AI companion" tone="brand" />
        </View>
      </Group>

      <Group title="Segmented">
        <Segmented label="Range" options={['Day', 'Week', 'Month'] as const} value={seg} onChange={setSeg} />
      </Group>

      <Group title="Inputs">
        <Input label="Email" placeholder="jordan@example.com" />
        <Input label="Password" placeholder="••••••" secureTextEntry icon="eye-off" onIconPress={() => {}} iconLabel="Show password" />
        <Input area a11yLabel="Today's journal" placeholder="Type here" />
      </Group>

      <Group title="Cards + rows">
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="caption" color="textMuted">
                Thu 15 Oct · 8:10 am
              </T>
              <T v="bodySm">Feeling</T>
              <T v="mood" tint={moodColors.notGreat.word}>
                Not great
              </T>
            </View>
            <FaceCircle face={FACES.frownHexagon} tint={moodColors.notGreat.tint} />
          </View>
        </Card>
        <Card tone="brand" onPress={() => {}} label="Check in">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Icon name="plus" color={c.onBrand} />
            <T v="bodyLg" tint={c.onBrand}>
              see how you’re feeling
            </T>
          </View>
        </Card>
        <Card tone="tint">
          <View style={{ gap: space.md }}>
            <Badge label="AI companion" tone="brand" />
            <T v="bodyLg" color="brand">
              Here’s one way to start. 1. Put the sheet and a pencil on the desk.
            </T>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Open as a checklist" size="small" />
              <Button title="Answer" size="small" variant="outline" />
            </View>
          </View>
        </Card>
        <Card tone="outlined">
          <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
            <Avatar initials="PS" size={64} />
            <View style={{ flex: 1, gap: 4 }}>
              <Badge label="THURSDAY 15 OCTOBER" />
              <T v="section">Session with Priya</T>
              <T v="bodySm" color="textMuted">
                4:00 pm · Video call
              </T>
            </View>
          </View>
        </Card>
        <View>
          <ListRow title="session with Priya at 4:00 pm" tag="SESSION" chevron onPress={() => {}} divider />
          <ListRow title="Text size" value="Bigger" onPress={() => {}} divider />
          <SwitchRow title="Read things aloud" on={sw} onToggle={() => setSw(!sw)} />
        </View>
      </Group>

      <Group title="Progress">
        <ProgressBar value={0.4} label="2 of 5 steps" />
        <StepDashes step={2} total={5} />
      </Group>

      <Group title="Notes + call card">
        <EmergencyNote callButton />
        <CallSomeoneCard />
      </Group>

      <Group title="Section header / divider / art">
        <SectionHeader title="Your day" action="Edit" />
        <Divider />
        <Image source={ART.heroHome} style={{ width: '100%', height: 200, borderRadius: radius.card }} resizeMode="cover" />
        <Image source={ART.cheer} style={{ width: 140, height: 140, alignSelf: 'center' }} resizeMode="contain" />
      </Group>

      <Group title="Dialog + motion">
        <Button title="Open dialog" variant="outline" onPress={() => setDialog(true)} />
        <Appear>
          <Card>
            <T>This card fades in (off with reduce-motion).</T>
          </Card>
        </Appear>
        <Button title="Back to welcome" variant="text" onPress={() => router.replace('/welcome')} />
      </Group>

      <Dialog visible={dialog} onClose={() => setDialog(false)} title="You're booked" art={<Image source={ART.cheer} style={{ width: 96, height: 96 }} resizeMode="contain" />}>
        <T center color="textSecondary">
          Thursday 15 October, 4:00 pm with Priya Shah. Video call.
        </T>
        <Button title="Done" onPress={() => setDialog(false)} />
        <Button title="See sessions" variant="outline" onPress={() => setDialog(false)} />
      </Dialog>
    </Screen>
  );
}
