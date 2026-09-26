/**
 * T11a Your profile (from Account). Therapists join by invitation, and details can be missed or change, so the
 * therapist edits what families see: role, years with kids, the line on their card, the headline, "About", "Good fit
 * for" and the clinic. Saved changes show at once on Find a therapist, the profile and Book. No illustration here:
 * the therapist's own photo (families still see initials). Name and email come from the invitation; changing them
 * goes through support.
 */
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { EmojiCircle } from '@/components/NotesParts';
import { PhotoAvatar } from '@/components/PhotoAvatar';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { SwitchRow } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { PHOTOS } from '@/data/faces';
import { PRACTITIONER } from '@/data/practice';
import type { Therapist } from '@/data/therapists';
import { demoOnly } from '@/lib/call';
import { useApp, useTherapist, type ProfileEdit } from '@/store/app';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const ROLES: Therapist['role'][] = ['Psychologist', 'Occupational therapist', 'Speech pathologist'];
const PICTURES = ['🧩', '🌋', '🏫', '🎧', '🗓️', '✋', '💬', '🤝', '🖼️', '🌿'];

type Draft = {
  role: Therapist['role'];
  years: string;
  blurb: string;
  tagline: string;
  about: string;
  goodFor: Therapist['goodFor'];
  inPerson: boolean;
  clinicName: string;
  clinicAddress: string;
};

const yearsOf = (s: string) => s.match(/\d+/)?.[0] ?? '';

export default function YourProfile() {
  const { c } = useTheme();
  const t = useTherapist('priya');
  const [d, setD] = useState<Draft>(() => ({
    role: t.role,
    years: yearsOf(t.years),
    blurb: t.blurb,
    tagline: t.tagline,
    about: t.about,
    goodFor: t.goodFor.map((g) => ({ ...g })),
    inPerson: !!t.clinic,
    clinicName: t.clinic?.name ?? '',
    clinicAddress: t.clinic?.address ?? '',
  }));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const edit = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }));
    setSaved(false);
    setError(null);
  };

  const save = () => {
    const years = parseInt(d.years, 10);
    if (!d.tagline.trim() || !d.about.trim()) return setError('Add a headline and a few words about you.');
    if (!years || years < 1 || years > 60) return setError('Add how many years you’ve worked with kids.');
    if (d.inPerson && (!d.clinicName.trim() || !d.clinicAddress.trim())) return setError('Add the clinic’s name and address, or switch in-person off.');
    const patch: ProfileEdit = {
      role: d.role,
      years: `${years} ${years === 1 ? 'YEAR' : 'YEARS'} WITH KIDS`,
      blurb: d.blurb.trim() || `${d.role} · ${d.inPerson ? `Video or ${d.clinicName.trim()}` : 'Video'}`,
      tagline: d.tagline.trim(),
      about: d.about.trim(),
      goodFor: d.goodFor.map((g) => ({ ...g, text: g.text.trim() })).filter((g) => g.text),
      clinic: d.inPerson ? { name: d.clinicName.trim(), address: d.clinicAddress.trim() } : null,
    };
    useApp.getState().updateProfile('priya', patch);
    setSaved(true);
  };

  return (
    <Screen
      backdrop="brand"
      header={<Header title="Your profile" getHelp={false} fallback="/therapist/account" />}
      footer={
        <View style={{ gap: space.sm }}>
          {error ? (
            <T v="bodySm" color="onWarnTint" accessibilityLiveRegion="polite">
              {error}
            </T>
          ) : saved ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }} accessibilityLiveRegion="polite">
              <Icon name="check-circle" size={18} color={c.onSuccessTint} />
              <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>
                Saved. Families see this now.
              </T>
            </View>
          ) : null}
          <Button title="Save changes" icon="check" onPress={save} />
          <Button
            title="See it as families do"
            variant="text"
            style={{ alignSelf: 'center' }}
            onPress={() => router.push('/parent/therapist?id=priya&preview=1' as Href)}
          />
        </View>
      }
    >
      <Stagger>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <PhotoAvatar photo={PHOTOS.priya.face} size={80} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="heading" header>
                {PRACTITIONER.name}
              </T>
              <T v="bodySm" color="textMuted">
                {PRACTITIONER.email}
              </T>
              <Button title="Change photo" variant="text" iconLeft="camera" onPress={() => demoOnly('In the real app you could upload a new photo.')} />
            </View>
          </View>
          <T v="bodySm" color="textMuted" style={{ marginTop: space.sm }}>
            Your name and email come from your invitation. To change them, contact SafeGate support.
          </T>
        </Card>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Your role" />
          <ChipRow>
            {ROLES.map((r) => (
              <Chip key={r} label={r} radio selected={d.role === r} onPress={() => edit({ role: r })} />
            ))}
          </ChipRow>
        </View>

        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ gap: space.lg }}>
            <Input label="Years working with kids" value={d.years} onChangeText={(v) => edit({ years: v.replace(/[^0-9]/g, '').slice(0, 2) })} keyboardType="number-pad" />
            <Input label="The line on your card" value={d.blurb} onChangeText={(v) => edit({ blurb: v })} placeholder="Psychologist · Autistic kids and teens · Video or Parramatta" />
            <Input label="Headline" value={d.tagline} onChangeText={(v) => edit({ tagline: v })} placeholder="Calm, practical sessions for kids and their families." />
            <Input label="About you" area multiline value={d.about} onChangeText={(v) => edit({ about: v })} style={{ minHeight: 100 }} placeholder="Where you work and the ages you work with." />
          </View>
        </Card>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Good fit for" />
          <Card tone="raised" r={24} padding={space.lg}>
            <View style={{ gap: space.sm }}>
              {d.goodFor.map((g, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Tappable
                    label={`Picture for ${g.text || `item ${i + 1}`}: ${g.emoji}. Change`}
                    visualHeight={48}
                    onPress={() => edit({ goodFor: d.goodFor.map((x, j) => (j === i ? { ...x, emoji: PICTURES[(PICTURES.indexOf(x.emoji) + 1) % PICTURES.length] } : x)) })}
                  >
                    <EmojiCircle emoji={g.emoji} i={i} />
                  </Tappable>
                  <View style={{ flex: 1 }}>
                    <Input a11yLabel={`Good fit for, ${i + 1}`} value={g.text} onChangeText={(v) => edit({ goodFor: d.goodFor.map((x, j) => (j === i ? { ...x, text: v } : x)) })} />
                  </View>
                </View>
              ))}
              {d.goodFor.length < 3 ? (
                <Button title="Add one" variant="text" iconLeft="plus" onPress={() => edit({ goodFor: [...d.goodFor, { emoji: PICTURES[d.goodFor.length], text: '' }] })} />
              ) : null}
            </View>
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Clinic" />
          <Card tone="raised" r={24} padding={space.lg}>
            <SwitchRow
              emoji="🏥"
              title="I see families in person"
              subtitle={d.inPerson ? undefined : 'Families will see “Video only for now”.'}
              on={d.inPerson}
              onToggle={() => edit({ inPerson: !d.inPerson })}
              divider={d.inPerson}
            />
            {d.inPerson ? (
              <View style={{ gap: space.lg, paddingTop: space.md }}>
                <Input label="Clinic name" value={d.clinicName} onChangeText={(v) => edit({ clinicName: v })} placeholder="Parramatta" />
                <Input label="Address" value={d.clinicAddress} onChangeText={(v) => edit({ clinicAddress: v })} placeholder="12 George Street" />
              </View>
            ) : null}
          </Card>
          <T v="bodySm" color="textMuted">
            Whether families can book in person or by video on each time is set in My hours.
          </T>
        </View>
      </Stagger>
    </Screen>
  );
}
