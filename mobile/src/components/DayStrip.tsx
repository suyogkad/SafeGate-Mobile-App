import { View } from 'react-native';
import { dayLabel, dayNumber } from '../lib/schedule';
import { radius, shadow, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * A week as 7 day tiles, in the language of Book's time tiles: weekday caption, the day number in a circle (navy
 * when picked, with a blue edge), and a short word under it ("Open", "Full", "Off", "Away"). The word, not a
 * colour, says what the day is. Used by the Calendar and to pick a date in Add a time.
 */
export function DayStrip({
  days,
  selected,
  onSelect,
  wordFor,
  a11yFor,
}: {
  days: string[];
  selected: string | null;
  onSelect: (iso: string) => void;
  /** the short word under the number ("Off"); empty for none */
  wordFor?: (iso: string) => string;
  /** what a screen reader says after the date ("1 session, 2 open times") */
  a11yFor?: (iso: string) => string;
}) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: space.xs }}>
      {days.map((d) => {
        const on = d === selected;
        const word = wordFor?.(d) ?? '';
        const quiet = word === 'Off' || word === 'Away';
        return (
          <Tappable
            key={d}
            label={[dayLabel(d), a11yFor?.(d) ?? word].filter(Boolean).join(', ')}
            role="radio"
            checked={on}
            onPress={() => onSelect(d)}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 2,
              paddingVertical: space.sm,
              borderRadius: radius.tile,
              backgroundColor: on ? c.surfaceTint : quiet ? c.chip : c.bg,
              borderWidth: 2,
              borderColor: on ? c.primary : 'transparent',
              ...(on || quiet ? null : shadow.lift),
            }}
          >
            <T v="caption" color={on ? 'textSecondary' : 'textMuted'} allowFontScaling={false}>
              {dayLabel(d).slice(0, 3).toUpperCase()}
            </T>
            <View style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: on ? c.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <T v="section" tint={on ? c.onBrand : c.text} allowFontScaling={false}>
                {dayNumber(d)}
              </T>
            </View>
            <T v="caption" color={quiet ? 'textSecondary' : 'brand'} allowFontScaling={false} style={{ fontSize: 11, lineHeight: 14 }}>
              {word || ' '}
            </T>
          </Tappable>
        );
      })}
    </View>
  );
}
