/**
 * P12 Book (+ P12b You're booked). Segmented This week | Next week, slot tiles (weekday, day number in a circle,
 * navy when picked, time below), how to meet, and a sticky "Book this time". The confirmation is a dialog.
 * Every therapist's times come from their own hours minus their bookings (Priya's are edited in My hours / Add a
 * time, so a change on the therapist's side shows here at once). Only the ways they offer show (Sam is video only).
 * No payment step (not in this product).
 * bookSession() updates Parent Home "Coming up", Sessions, the child's Home row 1 and My sessions.
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
import { ART } from '@/data/faces';
import { type Slot } from '@/data/therapists';
import { addDays, bookableSlots, dayCaps, dayLabel, dayShort, DEMO_TODAY, timeLabel, weekStart } from '@/lib/schedule';
import { useApp, useAvailabilityOf, useBookings, useChildName, useTherapist } from '@/store/app';
import { radius, shadow, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const WEEKS = ['This week', 'Next week'] as const;

/**
 * Leave the booking flow for a parent tab. `replace` stays inside the app; `dismissTo` / `dismissAll` walk back
 * through the browser history on web, which can leave the app, reload the page and reset the demo.
 */
function backToTab(tab: '/parent/home' | '/parent/sessions') {
  router.replace(tab);
}

export default function Book() {
  const { c } = useTheme();
  const name = useChildName();
  const t = useTherapist(useLocalSearchParams<{ id?: string }>().id ?? 'priya');
  const availability = useAvailabilityOf(t.id);
  const bookings = useBookings(t.id);

  // "This week" is the coming Monday to Sunday (the demo day is a Sunday).
  const weekSlots = (w: (typeof WEEKS)[number]): { main: Slot[]; more: Slot[] } => {
    const monday = addDays(weekStart(addDays(DEMO_TODAY, 1)), w === 'This week' ? 0 : 7);
    const all = bookableSlots(availability, bookings, monday, addDays(monday, 6)).map<Slot>((o) => ({
      day: dayShort(o.date),
      dateLabel: dayLabel(o.date),
      short: dayCaps(o.date),
      time: timeLabel(o.start),
      joinOpens: timeLabel(o.start - 10),
      kind: o.kind,
    }));
    return { main: all.slice(0, 3), more: all.slice(3) };
  };

  const [week, setWeek] = useState<(typeof WEEKS)[number]>('This week');
  const [more, setMore] = useState(false);
  const [picked, setPicked] = useState<Slot | null>(() => weekSlots('This week').main[0] ?? null);
  const [how, setHow] = useState<'Video call' | 'In person'>('Video call');
  // What was booked, kept for the dialog: once booked, that time leaves the list of free times.
  const [booked, setBooked] = useState<{ slot: Slot; meet: 'Video call' | 'In person' } | null>(null);

  const set = weekSlots(week);
  const slots = more ? [...set.main, ...set.more] : set.main;
  // The picked time can disappear if the therapist changes their hours meanwhile: fall back to the first one.
  const slot = picked && [...set.main, ...set.more].some((s) => s.short === picked.short && s.time === picked.time) ? picked : (slots[0] ?? null);
  const place = t.clinic ? `${t.clinic.name} clinic, ${t.clinic.address}` : null;
  const canVideo = availability.video && slot?.kind !== 'In person';
  const canInPerson = !!t.clinic && availability.inPerson && slot?.kind !== 'Video call';
  const meet: 'Video call' | 'In person' = how === 'In person' ? (canInPerson ? 'In person' : 'Video call') : canVideo ? 'Video call' : 'In person';

  const book = () => {
    if (!slot) return;
    useApp.getState().bookSession({
      therapist: t.name,
      therapistFirst: t.first,
      role: t.role.toLowerCase(),
      dateLabel: slot.dateLabel,
      short: slot.short,
      time: slot.time,
      kind: meet,
      place: meet === 'In person' ? place : null,
      joinOpens: slot.joinOpens,
    });
    setBooked({ slot, meet });
  };

  return (
    <Screen
      backdrop="brand"
      header={<Header title={`Book with ${t.first}`} getHelp={false} fallback={`/parent/therapist?id=${t.id}`} />}
      footer={
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Icon name="calendar" size={16} color={c.textMuted} />
            <T v="bodySm" color="textSecondary" style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {slot ? `${slot.dateLabel}, ${slot.time} · ${meet}` : 'Pick a time'}
            </T>
          </View>
          <Button title="Book this time" icon="arrow-right" disabled={!slot} onPress={book} />
        </View>
      }
    >
      <Appear>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar initials={t.initials} size={52} />
            <View style={{ flex: 1 }}>
              <T v="section">{t.name}</T>
              <T v="bodySm" color="textMuted">
                {t.role}
              </T>
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
          setPicked(weekSlots(w).main[0] ?? null);
        }}
      />

      <View style={{ gap: space.md }}>
        <T v="section" header>
          Pick a time
        </T>
        {slots.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {slots.map((s) => (
              <SlotTile key={s.short + s.time} slot={s} selected={!!slot && s.short === slot.short && s.time === slot.time} onPress={() => setPicked(s)} />
            ))}
          </View>
        ) : (
          <Card tone="raised" r={24} padding={space.lg}>
            <T v="body" color="textSecondary">
              {t.first} has no free times {week === 'This week' ? 'this week' : 'next week'}. {week === 'This week' ? 'Try next week.' : 'Try this week.'}
            </T>
          </Card>
        )}
        {!more && set.more.length ? <Button title="More times" variant="text" iconLeft="plus" onPress={() => setMore(true)} /> : null}
      </View>

      <View style={{ gap: space.md }}>
        <T v="section" header>
          How would you like to meet?
        </T>
        {canVideo ? <OptionRow label="Video call" emoji="📹" selected={meet === 'Video call'} onPress={() => setHow('Video call')} /> : null}
        {canInPerson && t.clinic ? <OptionRow label={`In person in ${t.clinic.name}`} emoji="🏥" selected={meet === 'In person'} onPress={() => setHow('In person')} /> : null}
      </View>

      <Card tone="tint" padding={space.lg}>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Icon name="smartphone" size={18} color={c.brand} />
          <T v="bodySm" color="brand" style={{ flex: 1 }}>
            {name} will see this session on their phone.
          </T>
        </View>
      </Card>

      {/* P12b You're booked — confirmation dialog */}
      <Dialog
        visible={!!booked}
        onClose={() => setBooked(null)}
        title="You're booked"
        art={<Image source={ART.cheer} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" style={{ width: 108, height: 108 }} />}
      >
        <T v="bodyLg" center>
          {booked?.slot.dateLabel}, {booked?.slot.time} with {t.name}. {booked?.meet === 'In person' ? `In person at ${place}.` : 'Video call.'}
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
function SlotTile({ slot, selected, onPress }: { slot: Slot; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const [dow, num, mon] = slot.short.split(' ');
  return (
    <Tappable
      label={`${slot.dateLabel}, ${slot.time}`}
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
        {dow} · {mon}
      </T>
      <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: selected ? c.brand : c.surface, alignItems: 'center', justifyContent: 'center' }}>
        <T v="heading" tint={selected ? c.onBrand : c.text}>
          {num}
        </T>
      </View>
      <T v="bodySmMedium" color={selected ? 'brand' : 'text'}>
        {slot.time}
      </T>
    </Tappable>
  );
}
