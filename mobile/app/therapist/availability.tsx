/**
 * T03 My hours. Weekly hours per day, session length and gap, how you meet, the booking
 * window and notice, time off, and "What families see".
 *
 * Saving rebuilds the real times families can book, so the number at the bottom is the
 * actual count from the server, not an estimate. Sessions a family already booked are
 * deliberately left where they are: cancelling a child's session is something the
 * therapist does and tells the family about, not a side effect of editing a calendar.
 */
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
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
import { removeTimeOff, type ApiWorkingHours } from '@/api/therapist';
import { WEEKDAYS, type Weekday } from '@/data/practice';
import { dayShort, rangeLabel } from '@/lib/schedule';
import { useMe } from '@/lib/therapist';
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

/** The hours object as the save endpoint wants it, with one thing changed. */
const draft = (h: ApiWorkingHours, patch: Partial<ApiWorkingHours>) => ({
  weekly: patch.weekly ?? h.weekly,
  session_length_min: patch.session_length_min ?? h.session_length_min,
  gap_min: patch.gap_min ?? h.gap_min,
  offers_video: patch.offers_video ?? h.offers_video,
  offers_in_person: patch.offers_in_person ?? h.offers_in_person,
  booking_window_weeks: patch.booking_window_weeks ?? h.booking_window_weeks,
  notice_days: patch.notice_days ?? h.notice_days,
  timezone: h.timezone,
});

export default function MyHours() {
  const { c } = useTheme();
  const { me, loading, saveWorkingHours, applyHours } = useMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me) {
    return (
      <Screen backdrop="brand" header={<Header title="My hours" getHelp={false} fallback="/therapist/today" />}>
        <Card tone="raised" padding={space.lg}>
          <T v="bodyLg" color="textSecondary">
            {loading ? 'Loading…' : 'Your hours aren’t available right now.'}
          </T>
        </Card>
      </Screen>
    );
  }

  const h = me.hours;
  const hasClinic = !!me.clinic;

  const patch = async (p: Partial<ApiWorkingHours>) => {
    setBusy(true);
    const failed = await saveWorkingHours(draft(h, p));
    setBusy(false);
    setError(failed);
  };

  const dropTimeOff = async (id: string) => {
    setBusy(true);
    try {
      applyHours(await removeTimeOff(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen backdrop="brand" header={<Header title="My hours" getHelp={false} fallback="/therapist/today" />}>
      <Stagger>
        <View style={{ gap: space.xs }}>
          <T v="bodyLg">When families can book you.</T>
          <T v="bodySm" color="textMuted" accessibilityLiveRegion="polite">
            {error ?? 'Changes are saved as you go.'}
          </T>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Weekly hours" />
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            {WEEKDAYS.map((d, i) => {
              const ranges = h.weekly[d.id] ?? [];
              const on = ranges.length > 0;
              return (
                <View key={d.id} style={{ paddingVertical: space.sm, gap: space.sm, borderBottomWidth: i < 6 ? 1 : 0, borderBottomColor: c.divider }}>
                  {/* Switching a day on asks for its hours first; switching it off clears them. */}
                  <Tappable
                    label={d.label}
                    role="switch"
                    checked={on}
                    onPress={() =>
                      on
                        ? patch({ weekly: { ...h.weekly, [d.id as Weekday]: [] } })
                        : router.push(`/therapist/hours?day=${d.id}` as Href)
                    }
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
                      <Button
                        title="Add hours"
                        variant="text"
                        iconLeft="plus"
                        label={`Add hours on ${d.label}`}
                        onPress={() => router.push(`/therapist/hours?day=${d.id}` as Href)}
                      />
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
            value={`${h.session_length_min} min` as (typeof LENGTHS)[number]}
            onChange={(v) => patch({ session_length_min: parseInt(v, 10) })}
          />
          <SectionHeader title="Gap between sessions" />
          <Segmented
            label="Gap between sessions"
            options={GAPS}
            value={(h.gap_min ? `${h.gap_min} min` : 'None') as (typeof GAPS)[number]}
            onChange={(v) => patch({ gap_min: v === 'None' ? 0 : parseInt(v, 10) })}
          />
          <T v="bodySm" color="textMuted">
            Changing the length rebuilds your open times. A session a family already booked keeps the length they booked.
          </T>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="How you meet" />
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            <SwitchRow emoji="📹" title="Video call" on={h.offers_video} onToggle={() => patch({ offers_video: !h.offers_video })} />
            <SwitchRow
              emoji="🏥"
              title={hasClinic ? `In person at ${me.clinic?.name}` : 'In person'}
              subtitle={hasClinic ? undefined : 'Add your clinic in Your profile first.'}
              on={h.offers_in_person && hasClinic}
              onToggle={() => (hasClinic ? patch({ offers_in_person: !h.offers_in_person }) : router.push('/therapist/profile' as Href))}
              divider={false}
            />
          </Card>
          {!h.offers_video && !(h.offers_in_person && hasClinic) ? (
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
              value={`${h.booking_window_weeks} ${h.booking_window_weeks === 1 ? 'week' : 'weeks'} ahead`}
              label={`Families can book up to ${h.booking_window_weeks} weeks ahead. Change`}
              divider
              onPress={() => patch({ booking_window_weeks: (h.booking_window_weeks % 6) + 1 })}
            />
            <ListRow
              title="Notice"
              value={noticeLabel(h.notice_days)}
              label={`Notice: at least ${noticeLabel(h.notice_days)}. Change`}
              onPress={() => patch({ notice_days: NOTICE[(NOTICE.indexOf(h.notice_days) + 1) % NOTICE.length] })}
            />
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="Time off" />
          <Card tone="raised" padding={space.lg} style={{ paddingVertical: space.xs }}>
            {h.time_off.map((t) => (
              <View
                key={t.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: size.touch, borderBottomWidth: 1, borderBottomColor: c.divider }}
              >
                <Icon name="sun" size={22} color={c.text} />
                <View style={{ flex: 1 }}>
                  <T v="bodyLg">{offLabel(t.from_date, t.to_date)}</T>
                  {t.label ? (
                    <T v="bodySm" color="textMuted">
                      {t.label}
                    </T>
                  ) : null}
                </View>
                <IconButton
                  icon="x"
                  label={`Remove time off, ${offLabel(t.from_date, t.to_date)}`}
                  variant="plain"
                  disabled={busy}
                  onPress={() => dropTimeOff(t.id)}
                />
              </View>
            ))}
            <ListRow title="Add time off" icon="plus" chevron onPress={() => router.push('/therapist/slot?mode=off' as Href)} />
          </Card>
        </View>

        <View style={{ gap: space.md }}>
          <SectionHeader title="What families see" />
          <Card tone="raised" r={24} padding={space.lg}>
            <View style={{ gap: space.xs }}>
              <T v="heading" header>
                {h.open_times === 1 ? '1 open time' : `${h.open_times} open times`}
              </T>
              <T v="body" color="textSecondary">
                In the next {h.booking_window_weeks} {h.booking_window_weeks === 1 ? 'week' : 'weeks'}, after{' '}
                {noticeLabel(h.notice_days)}’ notice.
              </T>
            </View>
          </Card>
          <Button title="Edit what families read about you" variant="text" onPress={() => router.push('/therapist/profile' as Href)} />
        </View>
      </Stagger>
    </Screen>
  );
}
