/**
 * T03 My hours. Uses the parts of Alex's day (setting rows that change on tap + switch rows) and Book (the how-to-meet
 * pictures): weekly hours per day, session length and gap (segmented), how you meet, the booking window and notice,
 * time off, and "What families see" (the Find a therapist card, live). Changes save as you go, like Comfort
 * settings, and families' Find a therapist / Book change at once. Times are picked, never typed.
 */
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { TherapistCard } from '@/components/TherapistCard';
import { Stagger } from '@/components/ui/Appear';
import { SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow } from '@/components/ui/ListRow';
import { Segmented } from '@/components/ui/Segmented';
import { SwitchRow, SwitchVisual } from '@/components/ui/Switch';
import { T } from '@/components/ui/T';
import { Tappable } from '@/components/ui/Tappable';
import { WEEKDAYS, type Availability } from '@/data/practice';
import { addDays, bookableSlots, dayShort, DEMO_TODAY, rangeLabel } from '@/lib/schedule';
import { useApp, useBookings, useTherapist } from '@/store/app';
import { size, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const LENGTHS = ['45 min', '50 min', '60 min'] as const;
const GAPS = ['None', '10 min', '15 min'] as const;
const NOTICE = [1, 2, 7];
const noticeLabel = (d: number) => (d === 7 ? '1 week' : d === 1 ? '1 day' : `${d} days`);

/** "Mon 26 – Tue 27 Oct" / "Fri 30 Oct" */
const offLabel = (from: string, to: string) => {
  if (from === to) return dayShort(from);
  const a = dayShort(from).split(' ');
  const b = dayShort(to);
  return a[2] === b.split(' ')[2] ? `${a[0]} ${a[1]} – ${b}` : `${dayShort(from)} – ${b}`;
};

export default function MyHours() {
  const { c } = useTheme();
  const a = useApp((s) => s.availability);
  const bookings = useBookings();
  const set = useApp((s) => s.setAvailability);
  const setDayHours = useApp((s) => s.setDayHours);
  const priya = useTherapist('priya');

  const openCount = bookableSlots(a, bookings, DEMO_TODAY, addDays(DEMO_TODAY, a.windowWeeks * 7)).length;
  const patch = (p: Partial<Pick<Availability, 'lengthMin' | 'gapMin' | 'video' | 'inPerson' | 'windowWeeks' | 'noticeDays'>>) => set(p);

  return (
    <Screen backdrop="brand" header={<Header title="My hours" getHelp={false} fallback="/therapist/today" />}>
      <Stagger>
        <View style={{ gap: space.xs }}>
          <T v="bodyLg">When families can book you.</T>
          <T v="bodySm" color="textMuted">
            Changes are saved as you go.
          </T>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Weekly hours" />
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            {WEEKDAYS.map((d, i) => {
              const ranges = a.weekly[d.id];
              const on = ranges.length > 0;
              return (
                <View key={d.id} style={{ paddingVertical: space.sm, gap: space.sm, borderBottomWidth: i < 6 ? 1 : 0, borderBottomColor: c.divider }}>
                  {/* Switching a day on asks for its hours first; switching it off clears them. */}
                  <Tappable
                    label={d.label}
                    role="switch"
                    checked={on}
                    onPress={() => (on ? setDayHours(d.id, []) : router.push(`/therapist/hours?day=${d.id}` as Href))}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: size.touch - space.sm }}
                  >
                    <View style={{ flex: 1 }}>
                      <T v="bodyLg">{d.label}</T>
                      {!on ? (
                        <T v="bodySm" color="textMuted">
                          Off
                        </T>
                      ) : null}
                    </View>
                    <SwitchVisual on={on} />
                  </Tappable>
                  {on ? (
                    <ChipRow>
                      {ranges.map((r, j) => (
                        <Chip
                          key={j}
                          label={rangeLabel(r.start, r.end)}
                          icon="edit-2"
                          a11yLabel={`${d.label}, ${rangeLabel(r.start, r.end).replace('–', 'to')}. Change`}
                          onPress={() => router.push(`/therapist/hours?day=${d.id}&i=${j}` as Href)}
                        />
                      ))}
                      <Button title="Add hours" variant="text" iconLeft="plus" label={`Add hours on ${d.label}`} onPress={() => router.push(`/therapist/hours?day=${d.id}` as Href)} />
                    </ChipRow>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Session length" />
          <Segmented
            label="Session length"
            options={LENGTHS}
            value={`${a.lengthMin} min` as (typeof LENGTHS)[number]}
            onChange={(v) => patch({ lengthMin: parseInt(v, 10) as Availability['lengthMin'] })}
          />
          <SectionHeader title="Gap between sessions" />
          <Segmented
            label="Gap between sessions"
            options={GAPS}
            value={(a.gapMin ? `${a.gapMin} min` : 'None') as (typeof GAPS)[number]}
            onChange={(v) => patch({ gapMin: (v === 'None' ? 0 : parseInt(v, 10)) as Availability['gapMin'] })}
          />
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="How you meet" />
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            <SwitchRow emoji="📹" title="Video call" on={a.video} onToggle={() => patch({ video: !a.video })} />
            <SwitchRow emoji="🏥" title={`In person at ${priya.clinic?.name ?? 'the clinic'}`} on={a.inPerson} onToggle={() => patch({ inPerson: !a.inPerson })} divider={false} />
          </Card>
          {!a.video && !a.inPerson ? (
            <T v="bodySm" color="textSecondary">
              Families can’t book you while both are off.
            </T>
          ) : null}
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Booking" />
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            <ListRow
              title="Families can book up to"
              value={`${a.windowWeeks} ${a.windowWeeks === 1 ? 'week' : 'weeks'} ahead`}
              label={`Families can book up to ${a.windowWeeks} weeks ahead. Change`}
              divider
              onPress={() => patch({ windowWeeks: (a.windowWeeks % 6) + 1 })}
            />
            <ListRow
              title="Notice"
              value={noticeLabel(a.noticeDays)}
              label={`Notice: at least ${noticeLabel(a.noticeDays)}. Change`}
              onPress={() => patch({ noticeDays: NOTICE[(NOTICE.indexOf(a.noticeDays) + 1) % NOTICE.length] })}
            />
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Time off" />
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            {a.timeOff.map((t) => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: size.touch, borderBottomWidth: 1, borderBottomColor: c.divider }}>
                <Icon name="sun" size={22} color={c.text} />
                <View style={{ flex: 1 }}>
                  <T v="bodyLg">{offLabel(t.from, t.to)}</T>
                  {t.label ? (
                    <T v="bodySm" color="textMuted">
                      {t.label}
                    </T>
                  ) : null}
                </View>
                <IconButton icon="x" label={`Remove time off, ${offLabel(t.from, t.to)}`} variant="plain" onPress={() => useApp.getState().removeTimeOff(t.id)} />
              </View>
            ))}
            <ListRow title="Add time off" icon="plus" chevron onPress={() => router.push('/therapist/slot?mode=off' as Href)} />
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="What families see" />
          <TherapistCard t={priya} href={'/parent/therapist?id=priya&preview=1' as Href} />
          <T v="bodySm" color="textSecondary" accessibilityLiveRegion="polite">
            {openCount === 1 ? '1 open time' : `${openCount} open times`} in the next {a.windowWeeks} {a.windowWeeks === 1 ? 'week' : 'weeks'}.
          </T>
        </View>
      </Stagger>
    </Screen>
  );
}
