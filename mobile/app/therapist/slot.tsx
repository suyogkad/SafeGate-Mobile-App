/**
 * T04 Add or change a time (the raised "+" tab, Calendar, Today). Built like Book: day tiles, time chips, the
 * how-to-meet cards and a sticky bar that says exactly what will be saved. Nothing is typed except a time-off name.
 *  - add (default, ?date=): day · starts at · length · how you meet · repeat every week
 *  - ?date=&start=[&extra=]: change or remove an open time
 *  - ?mode=off: add time off (from · to · name)
 *  - ?booking=: a booked session, read-only (moving a family's session needs them, so it's out of scope) → Open session
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DayStrip } from '@/components/DayStrip';
import { goBack, Header } from '@/components/Header';
import { OptionRow } from '@/components/Options';
import { Screen } from '@/components/Screen';
import { TimeChooser } from '@/components/TimeChooser';
import { Stagger } from '@/components/ui/Appear';
import { Avatar, SectionHeader } from '@/components/ui/bits';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { SwitchRow } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { CLIENTS, type Availability, type Booking, type MeetKind } from '@/data/practice';
import { addDays, blocksForDay, dayLabel, DEMO_TODAY, rangeLabel, weekDays, weekdayOf, weekStart, type Block } from '@/lib/schedule';
import { useApp, useBookings, useChildName, useTherapist } from '@/store/app';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const FIRST = addDays(DEMO_TODAY, 1);
const THIS_WEEK = weekStart(FIRST);
const LAST_WEEK = addDays(THIS_WEEK, 35);
const LENGTHS = ['45 min', '50 min', '60 min'] as const;

/** Week arrows + the day strip (Off / Away / Open / Full under each day), as on the Calendar. */
function WeekPicker({ value, onChange, min = FIRST, label }: { value: string; onChange: (d: string) => void; min?: string; label: string }) {
  const a = useApp((s) => s.availability);
  const bookings = useBookings();
  const [monday, setMonday] = useState(weekStart(value));
  const days = weekDays(monday);
  const wordFor = (d: string) => {
    if (d < min) return '';
    const bs = blocksForDay(a, bookings, d);
    if (bs[0]?.type === 'away') return 'Away';
    if (bs[0]?.type === 'off') return 'Off';
    return bs.some((b) => b.type === 'open') ? 'Open' : 'Full';
  };
  const a11 = dayLabel(monday).split(' ');
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {monday > weekStart(min) ? <IconButton icon="chevron-left" label={`${label}: week before`} variant="soft" onPress={() => setMonday(addDays(monday, -7))} /> : <View style={{ width: 48 }} />}
        <T v="section" center style={{ flex: 1 }}>
          Week of {a11[1]} {a11[2]}
        </T>
        {monday < LAST_WEEK ? <IconButton icon="chevron-right" label={`${label}: week after`} variant="soft" onPress={() => setMonday(addDays(monday, 7))} /> : <View style={{ width: 48 }} />}
      </View>
      <DayStrip days={days} selected={value} onSelect={(d) => d >= min && onChange(d)} wordFor={wordFor} a11yFor={(d) => (d < min ? 'not available' : wordFor(d))} />
    </View>
  );
}

function Footer({ line, children }: { line: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="calendar" size={16} color={c.textMuted} />
        <T v="bodySm" color="textSecondary" style={{ flex: 1 }} accessibilityLiveRegion="polite">
          {line}
        </T>
      </View>
      {children}
    </View>
  );
}

const leave = () => goBack('/therapist/calendar');

/** Add time off: from · to (days) · an optional name. */
function TimeOff() {
  const [from, setFrom] = useState(FIRST);
  const [to, setTo] = useState(FIRST);
  const [name, setName] = useState('');
  const end = to < from ? from : to;
  const line = from === end ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(end)}`;
  return (
    <Screen
      backdrop="brand"
      header={<Header title="Add time off" left="close" getHelp={false} fallback="/therapist/availability" />}
      footer={
        <Footer line={`${line}${name.trim() ? ` · ${name.trim()}` : ''} · families can’t book these days`}>
          <Button
            title="Add time off"
            icon="check"
            onPress={() => {
              useApp.getState().addTimeOff({ from, to: end, label: name.trim() });
              goBack('/therapist/availability');
            }}
          />
        </Footer>
      }
    >
      <Stagger>
        <T v="bodyLg">Families won’t see any times on these days. Sessions already booked stay on your calendar.</T>
        <View style={{ gap: space.md }}>
          <SectionHeader title="From" />
          <WeekPicker label="From" value={from} onChange={(d) => {
            setFrom(d);
            if (to < d) setTo(d);
          }} />
        </View>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Until" />
          <WeekPicker label="Until" value={end} min={from} onChange={setTo} />
        </View>
        <Input label="Name (optional)" value={name} onChangeText={setName} placeholder="Conference" />
      </Stagger>
    </Screen>
  );
}

/** A booked session: read-only here; the session itself opens from "Open session". */
function Booked({ booking }: { booking: Booking }) {
  const name = useChildName();
  const who = booking.clientId === 'alex' ? name : CLIENTS[booking.clientId].name;
  const parent = CLIENTS[booking.clientId].parentFirst;
  return (
    <Screen
      backdrop="brand"
      header={<Header title={`Session with ${who}`} left="close" getHelp={false} fallback="/therapist/calendar" />}
      footer={<Button title="Open session" icon="arrow-right" onPress={() => router.replace(`/therapist/session?id=${booking.id}` as Href)} />}
    >
      <Stagger>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar initials={who.charAt(0)} size={52} tone="brand" />
            <View style={{ flex: 1, gap: 2 }}>
              <Badge label={booking.kind.toUpperCase()} tone="info" />
              <T v="section">{dayLabel(booking.date)}</T>
              <T v="bodySm" color="textMuted">
                {rangeLabel(booking.start, booking.start + booking.lengthMin)} · {who} · with {CLIENTS[booking.clientId].parent}
              </T>
            </View>
          </View>
        </Card>
        <T v="body" color="textSecondary">
          This time is booked. To move it, talk with {parent} first: the family books a new time themselves.
        </T>
      </Stagger>
    </Screen>
  );
}

export default function SlotScreen() {
  const params = useLocalSearchParams<{ mode?: string; booking?: string; date?: string; start?: string; extra?: string }>();
  const bookings = useBookings();
  if (params.mode === 'off') return <TimeOff />;
  const booking = params.booking ? bookings.find((b) => b.id === params.booking) : undefined;
  if (booking) return <Booked booking={booking} />;
  return <AddOrChange date={params.date} start={params.start ? Number(params.start) : undefined} extraId={params.extra} />;
}

/** Add a time, or change / remove an open one. */
function AddOrChange({ date: startDate, start: oldStart, extraId }: { date?: string; start?: number; extraId?: string }) {
  const a = useApp((s) => s.availability);
  const bookings = useBookings();
  const clinic = useTherapist('priya').clinic;
  const changing = oldStart !== undefined && !!startDate;
  const oldExtra = extraId ? a.extra.find((e) => e.id === extraId) : undefined;

  const [date, setDate] = useState(startDate && startDate >= FIRST ? startDate : FIRST);
  const [start, setStart] = useState<number>(oldStart ?? 600);
  const [length, setLength] = useState<Availability['lengthMin']>((oldExtra?.lengthMin as Availability['lengthMin']) ?? a.lengthMin);
  const [kind, setKind] = useState<MeetKind | null>(oldExtra?.kind ?? null);
  const [weekly, setWeekly] = useState(false);

  const end = start + length;
  // Other things already on that day (the time being changed doesn't count against itself).
  const dayBlocks = blocksForDay(a, bookings, date).filter((b) => !(changing && b.type === 'open' && b.date === startDate && b.start === oldStart));
  const clash = dayBlocks.find(
    (b): b is Extract<Block, { type: 'booked' | 'open' }> => (b.type === 'booked' || b.type === 'open') && start < b.end && b.start < end,
  );
  const away = dayBlocks[0]?.type === 'away' ? dayBlocks[0] : null;
  const kinds: { k: MeetKind | null; label: string; emoji: string }[] = [
    ...(a.video && a.inPerson ? [{ k: null, label: 'Either way (the family picks)', emoji: '🔀' }] : []),
    ...(a.video ? [{ k: 'Video call' as const, label: 'Video call', emoji: '📹' }] : []),
    ...(a.inPerson ? [{ k: 'In person' as const, label: `In person in ${clinic?.name ?? 'the clinic'}`, emoji: '🏥' }] : []),
  ];
  const kindWord = kind ?? (a.video && a.inPerson ? 'Video call or in person' : a.video ? 'Video call' : 'In person');
  const line = `${dayLabel(date)}, ${rangeLabel(start, end)} · ${kindWord}${weekly ? ' · every week' : ''}`;

  const save = () => {
    const s = useApp.getState();
    if (changing) s.removeOpenTime(startDate!, oldStart!, extraId);
    if (weekly) {
      const day = weekdayOf(date);
      s.setDayHours(day, [...a.weekly[day], { start, end: start + Math.max(length, a.lengthMin) }]);
    } else {
      s.addExtraTime({ date, start, lengthMin: length, kind });
    }
    leave();
  };

  return (
    <Screen
      backdrop="brand"
      header={<Header title={changing ? 'Change this time' : 'Add a time'} left="close" getHelp={false} fallback="/therapist/calendar" />}
      footer={
        <Footer line={clash ? `That clashes with ${clash.type === 'booked' ? 'a booked session' : 'an open time'} at ${rangeLabel(clash.start, clash.end)}` : line}>
          <Button title={changing ? 'Save this time' : 'Add time'} icon="check" disabled={!!clash || !!away} onPress={save} />
          {changing ? (
            <Button
              title="Remove this time"
              variant="text"
              iconLeft="trash-2"
              style={{ alignSelf: 'center' }}
              onPress={() => {
                useApp.getState().removeOpenTime(startDate!, oldStart!, extraId);
                leave();
              }}
            />
          ) : null}
        </Footer>
      }
    >
      <Stagger>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Day" />
          <WeekPicker label="Day" value={date} onChange={setDate} />
          {away ? (
            <Card tone="help" padding={space.lg}>
              <T v="bodySm" color="onHelpTint">
                You’re away that day ({away.label}). Pick another day, or remove the time off in My hours.
              </T>
            </Card>
          ) : null}
        </View>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Starts at" />
          <TimeChooser label="Starts at" value={start} onChange={setStart} />
        </View>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Length" />
          <Segmented label="Length" options={LENGTHS} value={`${length} min` as (typeof LENGTHS)[number]} onChange={(v) => setLength(parseInt(v, 10) as Availability['lengthMin'])} />
        </View>
        <View style={{ gap: space.md }}>
          <SectionHeader title="How you meet" />
          {kinds.map((o) => (
            <OptionRow key={o.label} label={o.label} emoji={o.emoji} selected={kind === o.k} onPress={() => setKind(o.k)} />
          ))}
        </View>
        <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
          <SwitchRow
            title={`Repeat every ${dayLabel(date).split(' ')[0]}`}
            subtitle={weekly ? 'Adds these hours to your weekly hours' : 'Just this once'}
            on={weekly}
            onToggle={() => setWeekly((w) => !w)}
            divider={false}
          />
        </Card>
      </Stagger>
    </Screen>
  );
}
