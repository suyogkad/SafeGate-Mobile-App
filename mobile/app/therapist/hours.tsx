/**
 * Day hours (from My hours): pick when a working day starts and ends, by tapping times
 * ("From", then "Until"), never typing. The sticky bar says what families will get
 * ("3 sessions of 50 min") before saving.
 *
 * ?day=fri adds hours (turning the day on); &i=0 changes or removes a range. Saving
 * writes the whole weekly template back, which rebuilds the open times families see.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { goBack, Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { TimeChooser } from '@/components/TimeChooser';
import { Stagger } from '@/components/ui/Appear';
import { SectionHeader } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { T } from '@/components/ui/T';
import type { ApiTimeRange } from '@/api/therapist';
import { WEEKDAYS, type Weekday } from '@/data/practice';
import { rangeLabel } from '@/lib/schedule';
import { useMe } from '@/lib/therapist';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const BACK = '/therapist/availability';

export default function DayHours() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ day?: string; i?: string }>();
  const { me, loading, saveWorkingHours } = useMe();

  const day = (WEEKDAYS.find((d) => d.id === params.day) ?? WEEKDAYS[4]).id as Weekday;
  const label = WEEKDAYS.find((d) => d.id === day)!.label;

  const ranges: ApiTimeRange[] = me?.hours.weekly[day] ?? [];
  const index = params.i !== undefined && ranges[Number(params.i)] ? Number(params.i) : null;
  const current = index !== null ? ranges[index] : null;

  // Chosen before the hours arrive, then the defaults below take over if untouched.
  const [from, setFrom] = useState<number | null>(null);
  const [until, setUntil] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = from ?? current?.start ?? 540;
  const end = until ?? current?.end ?? 720;

  if (!me) {
    return (
      <Screen backdrop="brand" header={<Header title={`${label} hours`} left="close" getHelp={false} fallback={BACK} />}>
        <Card tone="raised" padding={space.lg}>
          <T v="bodyLg" color="textSecondary">
            {loading ? 'Loading…' : 'Your hours aren’t available right now.'}
          </T>
        </Card>
      </Screen>
    );
  }

  const h = me.hours;
  const others = ranges.filter((_, j) => j !== index);
  const clash = others.find((r) => start < r.end && r.start < end);
  const fits = end > start ? Math.floor((end - start + h.gap_min) / (h.session_length_min + h.gap_min)) : 0;
  const ok = end > start && !clash && fits > 0;

  const write = async (next: ApiTimeRange[]) => {
    setBusy(true);
    const failed = await saveWorkingHours({
      weekly: { ...h.weekly, [day]: [...next].sort((a, b) => a.start - b.start) },
      session_length_min: h.session_length_min,
      gap_min: h.gap_min,
      offers_video: h.offers_video,
      offers_in_person: h.offers_in_person,
      booking_window_weeks: h.booking_window_weeks,
      notice_days: h.notice_days,
      timezone: h.timezone,
    });
    setBusy(false);
    if (failed) {
      setError(failed);
      return;
    }
    goBack(BACK);
  };

  return (
    <Screen
      backdrop="brand"
      header={<Header title={`${label} hours`} left="close" getHelp={false} fallback={BACK} />}
      footer={
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Icon name="calendar" size={16} color={c.textMuted} />
            <T v="bodySm" color="textSecondary" style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {error ??
                (end > start
                  ? `${label}, ${rangeLabel(start, end)} · ${fits === 1 ? '1 session' : `${fits} sessions`} of ${h.session_length_min} min`
                  : 'Pick an end time after the start')}
            </T>
          </View>
          <Button
            title={current ? 'Save these hours' : `Add ${label} hours`}
            icon="check"
            disabled={!ok || busy}
            onPress={() => write([...others, { start, end }])}
          />
          {current ? (
            <Button
              title="Remove these hours"
              variant="text"
              iconLeft="trash-2"
              style={{ alignSelf: 'center' }}
              disabled={busy}
              onPress={() => write(others)}
            />
          ) : null}
        </View>
      }
    >
      <Stagger>
        <T v="bodyLg">When can families book you on {label}s?</T>
        <View style={{ gap: space.md }}>
          <SectionHeader title="From" />
          <TimeChooser
            label="From"
            value={start}
            onChange={(t) => {
              setFrom(t);
              if (end <= t) setUntil(Math.min(t + 180, 1200));
            }}
          />
        </View>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Until" />
          <TimeChooser label="Until" value={end} after={start} onChange={setUntil} />
        </View>
        {clash ? (
          <Card tone="help" padding={space.lg}>
            <T v="bodySm" color="onHelpTint">
              This overlaps your {rangeLabel(clash.start, clash.end)} hours on {label}. Pick other times, or change those.
            </T>
          </Card>
        ) : null}
        {end > start && fits === 0 ? (
          <Card tone="help" padding={space.lg}>
            <T v="bodySm" color="onHelpTint">
              That’s shorter than one {h.session_length_min}-minute session.
            </T>
          </Card>
        ) : null}
      </Stagger>
    </Screen>
  );
}
