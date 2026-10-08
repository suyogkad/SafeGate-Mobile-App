/**
 * T04 Add or change a time (the raised "+" tab, Calendar, Today). Day tiles, a time chooser,
 * and a sticky bar that says exactly what will be saved. Nothing is typed except a time-off name.
 *  - add (default, ?date=): day · starts at · length · repeat every week
 *  - ?slot=<id>: change or remove one open time
 *  - ?mode=off: add time off (from · to · name)
 *  - ?session=<id>: a booked session, read-only — moving a family's session needs the family
 *
 * "Repeat every week" writes into the weekly hours; a one-off adds a single open time. Both
 * go to the server, so a family's Book screen changes the moment this screen saves.
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DayStrip } from '@/components/DayStrip';
import { goBack, Header } from '@/components/Header';
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
import { addOpenTime, addTimeOff, removeOpenTime, type ApiSlot } from '@/api/therapist';
import {
  addDays,
  dayLabel,
  localDateIso,
  localStartMinutes,
  rangeLabel,
  realBlocksForDay,
  todayIso,
  weekdayOf,
  weekDays,
  weekStart,
  type Block,
} from '@/lib/schedule';
import { useClients, useMyOpenTimesLive, useTherapistSessions } from '@/lib/clients';
import { useMe } from '@/lib/therapist';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const FIRST = addDays(todayIso(), 1);
const THIS_WEEK = weekStart(FIRST);
const LAST_WEEK = addDays(THIS_WEEK, 35);
const LENGTHS = ['45 min', '50 min', '60 min'] as const;

/** A local date and a minutes-from-midnight time, as the UTC instant the server stores. */
const atLocal = (date: string, minutes: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0).toISOString();
};

/** Week arrows + the day strip (Off / Away / Open / Full under each day), as on the Calendar. */
function WeekPicker({
  value,
  onChange,
  min = FIRST,
  label,
  blocksFor,
}: {
  value: string;
  onChange: (d: string) => void;
  min?: string;
  label: string;
  blocksFor: (d: string) => Block[];
}) {
  const [monday, setMonday] = useState(weekStart(value));
  const days = weekDays(monday);
  const wordFor = (d: string) => {
    if (d < min) return '';
    const bs = blocksFor(d);
    if (bs[0]?.type === 'away') return 'Away';
    if (bs[0]?.type === 'off') return 'Off';
    return bs.some((b) => b.type === 'open') ? 'Open' : 'Full';
  };
  const a11 = dayLabel(monday).split(' ');
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {monday > weekStart(min) ? (
          <IconButton icon="chevron-left" label={`${label}: week before`} variant="soft" onPress={() => setMonday(addDays(monday, -7))} />
        ) : (
          <View style={{ width: 48 }} />
        )}
        <T v="section" center style={{ flex: 1 }}>
          Week of {a11[1]} {a11[2]}
        </T>
        {monday < LAST_WEEK ? (
          <IconButton icon="chevron-right" label={`${label}: week after`} variant="soft" onPress={() => setMonday(addDays(monday, 7))} />
        ) : (
          <View style={{ width: 48 }} />
        )}
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

/** One day's blocks from the real slots, sessions and time off. */
function useDayBlocks() {
  const { me } = useMe();
  const { slots, reload } = useMyOpenTimesLive(me?.id);
  const sessions = useTherapistSessions();
  const timeOff = me?.hours.time_off ?? [];
  return {
    slots,
    reload,
    blocksFor: (d: string) => realBlocksForDay(slots, sessions, d, timeOff),
  };
}

/** Add time off: from · to (days) · an optional name. */
function TimeOff({ blocksFor }: { blocksFor: (d: string) => Block[] }) {
  const [from, setFrom] = useState(FIRST);
  const [to, setTo] = useState(FIRST);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = to < from ? from : to;
  const line = from === end ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(end)}`;

  const add = async () => {
    setBusy(true);
    try {
      await addTimeOff(from, end, name.trim());
      goBack('/therapist/availability');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      backdrop="brand"
      header={<Header title="Add time off" left="close" getHelp={false} fallback="/therapist/availability" />}
      footer={
        <Footer line={error ?? `${line}${name.trim() ? ` · ${name.trim()}` : ''} · families can’t book these days`}>
          <Button title="Add time off" icon="check" disabled={busy} onPress={add} />
        </Footer>
      }
    >
      <Stagger>
        <T v="bodyLg">Families won’t see any times on these days. Sessions already booked stay on your calendar.</T>
        <View style={{ gap: space.md }}>
          <SectionHeader title="From" />
          <WeekPicker
            label="From"
            value={from}
            blocksFor={blocksFor}
            onChange={(d) => {
              setFrom(d);
              if (to < d) setTo(d);
            }}
          />
        </View>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Until" />
          <WeekPicker label="Until" value={end} min={from} blocksFor={blocksFor} onChange={setTo} />
        </View>
        <Input label="Name (optional)" value={name} onChangeText={setName} placeholder="Conference" />
      </Stagger>
    </Screen>
  );
}

/** A booked session: read-only here; the session itself opens from "Open session". */
function Booked({ sessionId }: { sessionId: string }) {
  const sessions = useTherapistSessions();
  const clients = useClients();
  const s = sessions.find((x) => x.id === sessionId);

  if (!s) {
    return (
      <Screen backdrop="brand" header={<Header title="Session" left="close" getHelp={false} fallback="/therapist/calendar" />}>
        <T v="body" color="textMuted">
          Loading…
        </T>
      </Screen>
    );
  }

  const who = s.child_name ?? 'this child';
  const client = clients.find((cl) => cl.id === s.child_id);
  const date = localDateIso(new Date(s.start_time));
  const start = localStartMinutes(new Date(s.start_time));
  const end = localStartMinutes(new Date(s.end_time));

  return (
    <Screen
      backdrop="brand"
      header={<Header title={`Session with ${who}`} left="close" getHelp={false} fallback="/therapist/calendar" />}
      footer={<Button title="Open session" icon="arrow-right" onPress={() => router.replace(`/therapist/session?id=${s.id}` as Href)} />}
    >
      <Stagger>
        <Card tone="raised" r={24} padding={space.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar initials={who.charAt(0)} size={52} tone="brand" />
            <View style={{ flex: 1, gap: 2 }}>
              <Badge label={s.meeting_kind === 'video' ? 'VIDEO CALL' : 'IN PERSON'} tone="info" />
              <T v="section">{dayLabel(date)}</T>
              <T v="bodySm" color="textMuted">
                {rangeLabel(start, end)} · {who}
                {client?.parent ? ` · with ${client.parent}` : ''}
              </T>
            </View>
          </View>
        </Card>
        <T v="body" color="textSecondary">
          This time is booked. To move it, talk with {client?.parentFirst || 'the family'} first: the family books a new
          time themselves.
        </T>
      </Stagger>
    </Screen>
  );
}

export default function SlotScreen() {
  const params = useLocalSearchParams<{ mode?: string; session?: string; date?: string; slot?: string }>();
  const { slots, reload, blocksFor } = useDayBlocks();

  if (params.mode === 'off') return <TimeOff blocksFor={blocksFor} />;
  if (params.session) return <Booked sessionId={params.session} />;
  return <AddOrChange date={params.date} slotId={params.slot} slots={slots} reload={reload} blocksFor={blocksFor} />;
}

/** Add a time, or change / remove an open one. */
function AddOrChange({
  date: startDate,
  slotId,
  slots,
  reload,
  blocksFor,
}: {
  date?: string;
  slotId?: string;
  slots: ApiSlot[];
  reload: () => void;
  blocksFor: (d: string) => Block[];
}) {
  const { me, saveWorkingHours } = useMe();
  const existing = slotId ? slots.find((s) => s.id === slotId) : undefined;
  const changing = !!existing;

  const [date, setDate] = useState(startDate && startDate >= FIRST ? startDate : FIRST);
  const [start, setStart] = useState<number | null>(null);
  const [length, setLength] = useState<number | null>(null);
  const [weekly, setWeekly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const h = me?.hours;
  const openAt = existing ? localStartMinutes(new Date(existing.start_time)) : 600;
  const existingLength = existing
    ? localStartMinutes(new Date(existing.end_time)) - localStartMinutes(new Date(existing.start_time))
    : null;
  const from = start ?? openAt;
  const len = length ?? existingLength ?? h?.session_length_min ?? 50;
  const end = from + len;
  const day = existing ? localDateIso(new Date(existing.start_time)) : date;

  // Other things already on that day. The time being changed does not count against itself.
  const dayBlocks = blocksFor(day).filter((b) => !(b.type === 'open' && b.slotId === slotId));
  const clash = dayBlocks.find(
    (b): b is Extract<Block, { type: 'booked' | 'open' }> => (b.type === 'booked' || b.type === 'open') && from < b.end && b.start < end,
  );
  const away = dayBlocks[0]?.type === 'away' ? dayBlocks[0] : null;
  const line = `${dayLabel(day)}, ${rangeLabel(from, end)}${weekly ? ' · every week' : ''}`;

  const finish = () => {
    reload();
    goBack('/therapist/calendar');
  };

  const save = async () => {
    setBusy(true);
    try {
      if (existing) await removeOpenTime(existing.id);
      if (weekly && h) {
        // Into the weekly hours, so it comes back every week from now on.
        const key = weekdayOf(day);
        const failed = await saveWorkingHours({
          weekly: { ...h.weekly, [key]: [...(h.weekly[key] ?? []), { start: from, end }] },
          session_length_min: h.session_length_min,
          gap_min: h.gap_min,
          offers_video: h.offers_video,
          offers_in_person: h.offers_in_person,
          booking_window_weeks: h.booking_window_weeks,
          notice_days: h.notice_days,
          timezone: h.timezone,
        });
        if (failed) {
          setError(failed);
          return;
        }
      } else {
        await addOpenTime(atLocal(day, from), atLocal(day, end));
      }
      finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that time.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await removeOpenTime(existing.id);
      finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that time.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      backdrop="brand"
      header={<Header title={changing ? 'Change this time' : 'Add a time'} left="close" getHelp={false} fallback="/therapist/calendar" />}
      footer={
        <Footer
          line={
            error ??
            (clash
              ? `That clashes with ${clash.type === 'booked' ? 'a booked session' : 'an open time'} at ${rangeLabel(clash.start, clash.end)}`
              : line)
          }
        >
          <Button title={changing ? 'Save this time' : 'Add time'} icon="check" disabled={!!clash || !!away || busy} onPress={save} />
          {changing ? (
            <Button title="Remove this time" variant="text" iconLeft="trash-2" style={{ alignSelf: 'center' }} disabled={busy} onPress={remove} />
          ) : null}
        </Footer>
      }
    >
      <Stagger>
        {changing ? null : (
          <View style={{ gap: space.md }}>
            <SectionHeader title="Day" />
            <WeekPicker label="Day" value={date} blocksFor={blocksFor} onChange={setDate} />
          </View>
        )}
        {away ? (
          <Card tone="help" padding={space.lg}>
            <T v="bodySm" color="onHelpTint">
              You’re away that day ({away.label}). Pick another day, or remove the time off in My hours.
            </T>
          </Card>
        ) : null}
        <View style={{ gap: space.md }}>
          <SectionHeader title="Starts at" />
          <TimeChooser label="Starts at" value={from} onChange={setStart} />
        </View>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Length" />
          <Segmented
            label="Length"
            options={LENGTHS}
            value={`${len} min` as (typeof LENGTHS)[number]}
            onChange={(v) => setLength(parseInt(v, 10))}
          />
        </View>
        {/* How you meet is set once, in My hours: a family picks video or in person
            when they book, from what the therapist offers. */}
        <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
          <SwitchRow
            title={`Repeat every ${dayLabel(day).split(' ')[0]}`}
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
