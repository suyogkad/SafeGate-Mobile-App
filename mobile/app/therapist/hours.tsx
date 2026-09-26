/**
 * Day hours (from My hours): pick when a working day starts and ends, by tapping times ("From", then "Until"),
 * never typing. The sticky bar says what families will get ("3 sessions of 50 min") before saving, as Book's bar
 * says what will be booked. ?day=fri adds hours (turning the day on); &i=0 changes or removes a range.
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
import { WEEKDAYS, type Weekday } from '@/data/practice';
import { rangeLabel } from '@/lib/schedule';
import { useApp } from '@/store/app';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function DayHours() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ day?: string; i?: string }>();
  const day = (WEEKDAYS.find((d) => d.id === params.day) ?? WEEKDAYS[4]).id as Weekday;
  const label = WEEKDAYS.find((d) => d.id === day)!.label;
  const a = useApp((s) => s.availability);
  const ranges = a.weekly[day];
  const index = params.i !== undefined && ranges[Number(params.i)] ? Number(params.i) : null;
  const current = index !== null ? ranges[index] : null;

  const [from, setFrom] = useState<number>(current?.start ?? 540);
  const [until, setUntil] = useState<number>(current?.end ?? 720);

  const others = ranges.filter((_, j) => j !== index);
  const clash = others.find((r) => from < r.end && r.start < until);
  const fits = until > from ? Math.floor((until - from + a.gapMin) / (a.lengthMin + a.gapMin)) : 0;
  const ok = until > from && !clash && fits > 0;

  const leave = () => goBack('/therapist/availability');
  const save = () => {
    useApp.getState().setDayHours(day, [...others, { start: from, end: until }]);
    leave();
  };

  return (
    <Screen
      backdrop="brand"
      header={<Header title={`${label} hours`} left="close" getHelp={false} fallback="/therapist/availability" />}
      footer={
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Icon name="calendar" size={16} color={c.textMuted} />
            <T v="bodySm" color="textSecondary" style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {until > from
                ? `${label}, ${rangeLabel(from, until)} · ${fits === 1 ? '1 session' : `${fits} sessions`} of ${a.lengthMin} min`
                : 'Pick an end time after the start'}
            </T>
          </View>
          <Button title={current ? 'Save these hours' : `Add ${label} hours`} icon="check" disabled={!ok} onPress={save} />
          {current ? (
            <Button
              title="Remove these hours"
              variant="text"
              iconLeft="trash-2"
              style={{ alignSelf: 'center' }}
              onPress={() => {
                useApp.getState().setDayHours(day, others);
                leave();
              }}
            />
          ) : null}
        </View>
      }
    >
      <Stagger>
        <T v="bodyLg">When can families book you on {label}s?</T>
        <View style={{ gap: space.md }}>
          <SectionHeader title="From" />
          <TimeChooser label="From" value={from} onChange={(t) => {
            setFrom(t);
            if (until <= t) setUntil(Math.min(t + 180, 1200));
          }} />
        </View>
        <View style={{ gap: space.md }}>
          <SectionHeader title="Until" />
          <TimeChooser label="Until" value={until} after={from} onChange={setUntil} />
        </View>
        {clash ? (
          <Card tone="help" padding={space.lg}>
            <T v="bodySm" color="onHelpTint">
              This overlaps your {rangeLabel(clash.start, clash.end)} hours on {label}. Pick other times, or change those.
            </T>
          </Card>
        ) : null}
        {until > from && fits === 0 ? (
          <Card tone="help" padding={space.lg}>
            <T v="bodySm" color="onHelpTint">
              That’s shorter than one {a.lengthMin}-minute session.
            </T>
          </Card>
        ) : null}
      </Stagger>
    </Screen>
  );
}
