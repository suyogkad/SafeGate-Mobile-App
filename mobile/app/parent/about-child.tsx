/**
 * P02–P06 About your child, steps 1–5. One question per screen: a labelled text field, chips, option rows or a
 * multi-select tile grid, setup phases, sticky Next.
 * The name from step 1 is what SafeGate calls the child everywhere, and it is sent to
 * the backend when the child record is created (Link their phone).
 *
 * The other four answers stay on this phone. They describe a child's difficulties and
 * how they communicate, so storing them is a data-collection decision for the privacy
 * review, not something to slip in: SafeGate collects the minimum child data it needs.
 * The last step says so, rather than letting a parent think their therapist will read
 * them.
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { View } from 'react-native';
import { OptionRow, OptionTile, TileRows } from '@/components/Options';
import { SetupShell } from '@/components/SetupShell';
import { Stagger } from '@/components/ui/Appear';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { T } from '@/components/ui/T';
import { AGE_BANDS, COMMUNICATE, FEELING_LATELY, HARD_THINGS, HELP_MOST } from '@/data/aboutChild';
import { FACES } from '@/data/faces';
import { CHILD_DEFAULT_NAME } from '@/data/people';
import { useApp } from '@/store/app';
import { artTints, space } from '@/theme/tokens';

const FACE_FOR_STEP = [
  { face: FACES.smileBlobCyan, tint: artTints.cyan },
  { face: FACES.smileFlower, tint: artTints.lavender },
  { face: FACES.glassesSquare, tint: artTints.yellow },
  { face: FACES.smileGhost, tint: artTints.blue },
  { face: FACES.oMouthPink, tint: artTints.green },
];

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function AboutChild() {
  const step = Math.min(5, Math.max(1, Number(useLocalSearchParams<{ step?: string }>().step ?? 1)));
  const child = useApp((s) => s.child);
  const update = useApp((s) => s.updateChild);
  const name = child.name.trim() || CHILD_DEFAULT_NAME;

  const next: Href = step < 5 ? `/parent/about-child?step=${step + 1}` : '/parent/child-comfort';
  const answered = [
    !!child.name.trim() && !!child.age,
    !!child.feeling,
    child.hard.length > 0,
    !!child.help,
    child.communicate.length > 0,
  ][step - 1];

  const q = {
    1: { title: 'What should SafeGate call your child?', subtitle: "This is the name they'll see. A nickname is fine." },
    2: { title: `How has ${name} been feeling lately?`, subtitle: 'Pick the one that fits best.' },
    3: { title: `What tends to be hard for ${name}?`, subtitle: 'Pick all that fit.' },
    4: { title: `What would help ${name} most right now?`, subtitle: 'Pick the one that matters most.' },
    5: { title: `How does ${name} like to communicate?`, subtitle: 'Pick all that fit. This sets up the app for them.' },
  }[step as 1 | 2 | 3 | 4 | 5];

  return (
    <SetupShell
      phase={1}
      detail={`Question ${step} of 5`}
      face={FACE_FOR_STEP[step - 1].face}
      tint={FACE_FOR_STEP[step - 1].tint}
      title={q.title}
      subtitle={q.subtitle}
      fallback="/parent/create-account"
      footer={<Button title="Next" icon="arrow-right" disabled={!answered} onPress={() => router.push(next)} />}
    >
      {step === 1 ? (
        <Card tone="raised" r={24} padding={space.xl}>
          <View style={{ gap: space.xl }}>
            <Input label="Name or nickname" value={child.name} onChangeText={(v) => update({ name: v })} autoCapitalize="words" leftIcon="smile" placeholder={CHILD_DEFAULT_NAME} />
            <View style={{ gap: space.md }}>
              <T v="label">How old is {name}?</T>
              <ChipRow>
                {AGE_BANDS.map((a) => (
                  <Chip key={a} label={a} selected={child.age === a} onPress={() => update({ age: a })} />
                ))}
              </ChipRow>
            </View>
          </View>
        </Card>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: space.md }}>
          <Stagger start={160}>
            {FEELING_LATELY.map((o) => (
            <OptionRow key={o.label} label={o.label} emoji={o.emoji} selected={child.feeling === o.label} onPress={() => update({ feeling: o.label })} />
          ))}
          </Stagger>
        </View>
      ) : null}

      {step === 3 ? (
        <TileRows>
          {HARD_THINGS.map((o) => (
            <OptionTile key={o.label} label={o.label} emoji={o.emoji} selected={child.hard.includes(o.label)} onPress={() => update({ hard: toggle(useApp.getState().child.hard, o.label) })} />
          ))}
        </TileRows>
      ) : null}

      {step === 4 ? (
        <View style={{ gap: space.md }}>
          <Stagger start={160}>
            {HELP_MOST.map((o) => (
            <OptionRow key={o.label} label={o.label} emoji={o.emoji} selected={child.help === o.label} onPress={() => update({ help: o.label })} />
          ))}
          </Stagger>
        </View>
      ) : null}

      {step === 5 ? (
        <View style={{ gap: space.md }}>
          <Stagger start={160}>
            {COMMUNICATE.map((o) => (
            <OptionRow key={o} label={o} multi selected={child.communicate.includes(o)} onPress={() => update({ communicate: toggle(useApp.getState().child.communicate, o) })} />
          ))}
          </Stagger>
          <Card tone="raised" padding={space.lg}>
            <T v="bodySm" color="textSecondary">
              Your answers set up {name}’s app on this phone. They aren’t sent to SafeGate or shown to a therapist
              yet — you can tell your therapist anything you want them to know.
            </T>
          </Card>
        </View>
      ) : null}
    </SetupShell>
  );
}
