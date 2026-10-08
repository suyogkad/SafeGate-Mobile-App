/**
 * T11a Your profile (from Account). Therapists join by invitation, and details can be missed or
 * change, so the therapist edits what families read: their role, years with kids, the line on
 * their card, the headline, "About", "Good fit for" and the clinic. Saved changes show on the
 * family's Find a therapist and profile at once, because both read the same record.
 *
 * Name and email come from the invitation and are not editable here; changing them goes
 * through support. Whether each open time can be booked by video or in person is set in My hours.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { EmojiCircle } from '@/components/NotesParts';
import { Screen } from '@/components/Screen';
import { Stagger } from '@/components/ui/Appear';
import { Avatar, SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { SwitchRow } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import type { ApiGoodFor } from '@/api/therapist';
import { initialsOf } from '@/lib/time';
import { useMe } from '@/lib/therapist';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const ROLES = ['Psychologist', 'Occupational therapist', 'Speech pathologist'] as const;
const PICTURES = ['🧩', '🌋', '🏫', '🎧', '🗓️', '✋', '💬', '🤝', '🖼️', '🌿'];

type Draft = {
  role: string;
  years: string;
  blurb: string;
  tagline: string;
  about: string;
  goodFor: ApiGoodFor[];
  inPerson: boolean;
  clinicName: string;
  clinicAddress: string;
};

const EMPTY: Draft = {
  role: '',
  years: '',
  blurb: '',
  tagline: '',
  about: '',
  goodFor: [],
  inPerson: false,
  clinicName: '',
  clinicAddress: '',
};

export default function YourProfile() {
  const { c } = useTheme();
  const { me, loading, saveDetails } = useMe();
  const [d, setD] = useState<Draft>(EMPTY);
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fill the form once, when the profile arrives. Refilling it later would throw
  // away whatever the therapist had typed in the meantime.
  useEffect(() => {
    if (started || !me) return;
    setD({
      role: me.title,
      years: me.years_with_kids ? String(me.years_with_kids) : '',
      blurb: me.blurb,
      tagline: me.tagline,
      about: me.about,
      goodFor: me.good_for.map((g) => ({ ...g })),
      inPerson: !!me.clinic,
      clinicName: me.clinic?.name ?? '',
      clinicAddress: me.clinic?.address ?? '',
    });
    setStarted(true);
  }, [me, started]);

  const edit = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }));
    setSaved(false);
    setError(null);
  };

  const save = async () => {
    const years = parseInt(d.years, 10);
    if (!d.tagline.trim() || !d.about.trim()) return setError('Add a headline and a few words about you.');
    if (!years || years < 1 || years > 60) return setError('Add how many years you’ve worked with kids.');
    if (d.inPerson && (!d.clinicName.trim() || !d.clinicAddress.trim()))
      return setError('Add the clinic’s name and address, or switch in-person off.');

    setBusy(true);
    const failed = await saveDetails({
      title: d.role.trim(),
      years_with_kids: years,
      blurb: d.blurb.trim() || `${d.role || 'Therapist'} · ${d.inPerson ? `Video or ${d.clinicName.trim()}` : 'Video'}`,
      tagline: d.tagline.trim(),
      about: d.about.trim(),
      good_for: d.goodFor.map((g) => ({ ...g, text: g.text.trim() })).filter((g) => g.text),
      clinic_name: d.inPerson ? d.clinicName.trim() : null,
      clinic_address: d.inPerson ? d.clinicAddress.trim() : null,
    });
    setBusy(false);
    if (failed) {
      setError(failed);
      return;
    }
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
          <Button title="Save changes" icon="check" disabled={busy || !me} onPress={save} />
        </View>
      }
    >
      <Stagger>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <Avatar initials={initialsOf(me?.full_name)} size={80} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="heading" header>
                {me?.full_name || (loading ? 'Loading…' : 'Your name')}
              </T>
              <T v="bodySm" color="textMuted">
                {me?.email || ''}
              </T>
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
            <Input
              label="Years working with kids"
              value={d.years}
              onChangeText={(v) => edit({ years: v.replace(/[^0-9]/g, '').slice(0, 2) })}
              keyboardType="number-pad"
            />
            <Input
              label="The line on your card"
              value={d.blurb}
              onChangeText={(v) => edit({ blurb: v })}
              placeholder="Psychologist · Autistic kids and teens · Video or Parramatta"
            />
            <Input
              label="Headline"
              value={d.tagline}
              onChangeText={(v) => edit({ tagline: v })}
              placeholder="Calm, practical sessions for kids and their families."
            />
            <Input
              label="About you"
              area
              multiline
              value={d.about}
              onChangeText={(v) => edit({ about: v })}
              style={{ minHeight: 100 }}
              placeholder="Where you work and the ages you work with."
            />
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
                    onPress={() =>
                      edit({
                        goodFor: d.goodFor.map((x, j) =>
                          j === i ? { ...x, emoji: PICTURES[(PICTURES.indexOf(x.emoji) + 1) % PICTURES.length] } : x,
                        ),
                      })
                    }
                  >
                    <EmojiCircle emoji={g.emoji} i={i} />
                  </Tappable>
                  <View style={{ flex: 1 }}>
                    <Input
                      a11yLabel={`Good fit for, ${i + 1}`}
                      value={g.text}
                      onChangeText={(v) => edit({ goodFor: d.goodFor.map((x, j) => (j === i ? { ...x, text: v } : x)) })}
                    />
                  </View>
                </View>
              ))}
              {d.goodFor.length < 3 ? (
                <Button
                  title="Add one"
                  variant="text"
                  iconLeft="plus"
                  onPress={() => edit({ goodFor: [...d.goodFor, { emoji: PICTURES[d.goodFor.length], text: '' }] })}
                />
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
            {/* Both halves or neither: an address a family can't find is worse than none. */}
            Families can only book in person once both the name and the address are here. Which open times are
            video or in person is set in My hours.
          </T>
        </View>
      </Stagger>
    </Screen>
  );
}
