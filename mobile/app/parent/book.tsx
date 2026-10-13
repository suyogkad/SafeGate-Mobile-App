/**
 * P12 Book (+ P12b You're booked). This week | Next week, slot tiles, how to meet, and a
 * sticky "Book this time". The confirmation is a dialog. No payment step.
 *
 * The times are the therapist's real open slots. The backend has already taken out
 * anything inside their notice period or beyond their booking window, so every time on
 * this screen is genuinely bookable — and a time another family takes first disappears
 * on the next load rather than failing at the last step.
 *
 * "How would you like to meet?" offers only what this therapist actually offers, and in
 * person only when they have given a clinic address.
 */
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, View } from 'react-native';
import { Header } from '@/components/Header';
import { OptionRow } from '@/components/Options';
import { Screen } from '@/components/Screen';
import { Appear } from '@/components/ui/Appear';
import { Avatar } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { bookSession, type ApiSlot } from '@/api/family';
import { ART } from '@/data/faces';
import { useMyChild, useOpenTimes, useTherapistProfile } from '@/lib/family';
import { addDays, dayLabel, localDateIso, todayIso, weekStart } from '@/lib/schedule';
import { firstName, initialsOf, clockOf } from '@/lib/time';
import { radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const WEEKS = ['This week', 'Next week'] as const;
const DOW = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const MON = new Intl.DateTimeFormat(undefined, { month: 'short' });

/** Leave the booking flow for a parent tab, without walking back through web history. */
function backToTab(tab: '/parent/home' | '/parent/sessions') {
  router.replace(tab);
}

export default function Book() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const child = useMyChild();
  const { therapist } = useTherapistProfile(params.id);
  const { slots, loading, reload } = useOpenTimes(params.id);

  const [week, setWeek] = useState<(typeof WEEKS)[number]>('This week');
  const [more, setMore] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [how, setHow] = useState<'video' | 'in_person'>('video');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ slot: ApiSlot; kind: 'video' | 'in_person' } | null>(null);

  const name = child?.full_name || 'your child';
  const who = therapist?.full_name ?? 'your therapist';
  const whoFirst = firstName(who) || 'they';

  // "This week" is the Monday to Sunday the next bookable day falls in.
  const monday = addDays(weekStart(addDays(todayIso(), 1)), week === 'This week' ? 0 : 7);
  const sunday = addDays(monday, 6);
  const inWeek = slots.filter((s) => {
    const d = localDateIso(new Date(s.start_time));
    return d >= monday && d <= sunday;
  });
  const shown = more ? inWeek : inWeek.slice(0, 3);
  const slot = inWeek.find((s) => s.id === pickedId) ?? inWeek[0] ?? null;

  const canVideo = !!therapist?.offers_video;
  const canInPerson = !!therapist?.offers_in_person && !!therapist?.clinic;
  const meet: 'video' | 'in_person' = how === 'in_person' && canInPerson ? 'in_person' : canVideo ? 'video' : 'in_person';
  const place = therapist?.clinic ? `${therapist.clinic.name} clinic, ${therapist.clinic.address}` : null;

  const book = async () => {
    if (!slot || !child) {
      setError(child ? 'Pick a time first.' : 'Add your child before booking.');
      return;
    }
    setBusy(true);
    try {
      await bookSession(child.id, slot.id, meet);
      setBooked({ slot, kind: meet });
      setError(null);
    } catch (e) {
      // Most likely someone else took the time first; reload so the list is honest.
      setError(e instanceof Error ? e.message : 'Could not book that time.');
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      backdrop="brand"
      header={<Header title={`Book with ${whoFirst}`} getHelp={false} fallback={`/parent/therapist?id=${params.id ?? ''}`} />}
      footer={
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Icon name="calendar" size={16} color={c.textMuted} />
            <T v="bodySm" color="textSecondary" style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {error ??
                (slot
                  ? `${dayLabel(localDateIso(new Date(slot.start_time)))}, ${clockOf(slot.start_time)} · ${meet === 'video' ? 'Video call' : 'In person'}`
                  : 'Pick a time')}
            </T>
          </View>
          <Button title="Book this time" icon="arrow-right" disabled={!slot || busy} onPress={book} />
        </View>
      }
    >
      <Appear>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar initials={initialsOf(who) || '?'} size={52} />
            <View style={{ flex: 1 }}>
              <T v="section">{who}</T>
              {therapist?.title ? (
                <T v="bodySm" color="textMuted">
                  {therapist.title}
                </T>
              ) : null}
            </View>
          </View>
        </Card>
      </Appear>

      <Segmented
        label="Week"
        options={WEEKS}
        value={week}
        onChange={(w) => {
          setWeek(w);
          setMore(false);
          setPickedId(null);
        }}
      />

      <View style={{ gap: space.md }}>
        <T v="section" header>
          Pick a time
        </T>
        {shown.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {shown.map((s) => (
              <SlotTile key={s.id} slot={s} selected={slot?.id === s.id} onPress={() => setPickedId(s.id)} />
            ))}
          </View>
        ) : (
          <Card tone="raised" r={24} padding={space.lg}>
            <T v="body" color="textSecondary">
              {loading
                ? 'Looking for free times…'
                : `${whoFirst} has no free times ${week === 'This week' ? 'this week' : 'next week'}. ${week === 'This week' ? 'Try next week.' : 'Try this week.'}`}
            </T>
          </Card>
        )}
        {!more && inWeek.length > 3 ? <Button title="More times" variant="text" iconLeft="plus" onPress={() => setMore(true)} /> : null}
      </View>

      {canVideo || canInPerson ? (
        <View style={{ gap: space.md }}>
          <T v="section" header>
            How would you like to meet?
          </T>
          {canVideo ? <OptionRow label="Video call" emoji="📹" selected={meet === 'video'} onPress={() => setHow('video')} /> : null}
          {canInPerson && therapist?.clinic ? (
            <OptionRow
              label={`In person in ${therapist.clinic.name}`}
              emoji="🏥"
              selected={meet === 'in_person'}
              onPress={() => setHow('in_person')}
            />
          ) : null}
        </View>
      ) : null}

      <Card tone="tint" padding={space.lg}>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Icon name="smartphone" size={18} color={c.brand} />
          <T v="bodySm" color="brand" style={{ flex: 1 }}>
            {name} will see this session on their phone.
          </T>
        </View>
      </Card>

      {/* P12b You're booked */}
      <Dialog
        visible={!!booked}
        onClose={() => setBooked(null)}
        title="You're booked"
        art={<Image source={ART.cheer} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" style={{ width: 108, height: 108 }} />}
      >
        <T v="bodyLg" center>
          {booked ? `${dayLabel(localDateIso(new Date(booked.slot.start_time)))}, ${clockOf(booked.slot.start_time)}` : ''} with {who}.{' '}
          {booked?.kind === 'in_person' ? `In person at ${place}.` : 'Video call.'}
        </T>
        <T v="body" color="textSecondary" center>
          {name} will see it on their phone.
        </T>
        <Button
          title="Done"
          onPress={() => {
            setBooked(null);
            backToTab('/parent/home');
          }}
        />
        <Button
          title="See sessions"
          variant="outline"
          onPress={() => {
            setBooked(null);
            backToTab('/parent/sessions');
          }}
        />
      </Dialog>
    </Screen>
  );
}

/** A date circle as a slot: weekday, day number in a circle (navy when picked), time below. */
function SlotTile({ slot, selected, onPress }: { slot: ApiSlot; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const at = new Date(slot.start_time);
  return (
    <Tappable
      label={`${dayLabel(localDateIso(at))}, ${clockOf(at)}`}
      role="radio"
      checked={selected}
      selected={selected}
      onPress={onPress}
      style={{
        width: '31.5%',
        alignItems: 'center',
        gap: space.xs,
        paddingVertical: space.md,
        borderRadius: radius.card,
        backgroundColor: selected ? c.surfaceTint : c.bg,
        borderWidth: 2,
        borderColor: selected ? c.primary : 'transparent',
        ...(selected ? null : shadow.lift),
      }}
    >
      <T v="caption" color={selected ? 'textSecondary' : 'textMuted'}>
        {DOW.format(at)} · {MON.format(at)}
      </T>
      <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: selected ? c.brand : c.surface, alignItems: 'center', justifyContent: 'center' }}>
        <T v="heading" tint={selected ? c.onBrand : c.text}>
          {at.getDate()}
        </T>
      </View>
      <T v="bodySmMedium" color={selected ? 'brand' : 'text'}>
        {clockOf(at)}
      </T>
    </Tappable>
  );
}
