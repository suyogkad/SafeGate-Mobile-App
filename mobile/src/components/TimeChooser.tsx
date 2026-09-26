import { View } from 'react-native';
import { PICKABLE_TIMES, partOfDay, timeLabel } from '../lib/schedule';
import { space } from '../theme/tokens';
import { Chip, ChipRow } from './ui/Chip';
import { T } from './ui/T';

/**
 * Pick a time by tapping, never by typing numbers (dyscalculia checklist): half-hour chips grouped Morning /
 * Afternoon / Evening. The picked chip is the selected Chip (blue with a tick). `after` hides times up to that one
 * (an end time must come after the start).
 */
export function TimeChooser({ value, onChange, after, label }: { value: number | null; onChange: (min: number) => void; after?: number; label: string }) {
  const times = PICKABLE_TIMES.filter((t) => after === undefined || t > after);
  const groups = (['Morning', 'Afternoon', 'Evening'] as const).map((g) => ({ g, times: times.filter((t) => partOfDay(t) === g) })).filter((x) => x.times.length);
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: space.md }}>
      {groups.map(({ g, times: ts }) => (
        <View key={g} style={{ gap: space.sm }}>
          <T v="bodySm" color="textMuted">
            {g}
          </T>
          <ChipRow>
            {ts.map((t) => (
              <Chip key={t} label={timeLabel(t)} radio selected={t === value} onPress={() => onChange(t)} a11yLabel={`${label}: ${timeLabel(t)}`} />
            ))}
          </ChipRow>
        </View>
      ))}
    </View>
  );
}
