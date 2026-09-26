import { View } from 'react-native';
import { dayLabel, timeLabel } from '../lib/schedule';
import { radius, shadow, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Badge, type BadgeTone } from './ui/Badge';
import { Avatar } from './ui/bits';
import { Icon } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/** "Thursday 15 October" → "Thursday, 15 October" (as on the parent's Sessions cards) */
export const withComma = (d: string) => d.replace(/^(\w+) /, '$1, ');

/**
 * The parent's Sessions card, for the therapist side: an avatar, a tag + time, the date in bold, and one line.
 * The tag says the kind (VIDEO CALL / IN PERSON) or, for past sessions, where the notes are (NOTES SHARED, WRITE NOTES).
 */
export function SessionCard({
  date,
  start,
  initials,
  tag,
  tone = 'info',
  line,
  onPress,
  label,
}: {
  date: string;
  start: number;
  initials: string;
  tag: string;
  tone?: BadgeTone;
  line: string;
  onPress: () => void;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <Tappable label={label} onPress={onPress} style={{ backgroundColor: c.bg, borderRadius: radius.panel, padding: space.lg, ...shadow.lift }}>
      <View style={{ flexDirection: 'row', gap: space.lg }}>
        <Avatar initials={initials} size={52} />
        <View style={{ flex: 1, gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <Badge label={tag} tone={tone} />
            <T v="caption" color="textMuted">
              {timeLabel(start)}
            </T>
          </View>
          <T v="section">{withComma(dayLabel(date))}</T>
          <T v="bodySm" color="textSecondary">
            {line}
          </T>
        </View>
        <Icon name="chevron-right" size={20} color={c.textMuted} />
      </View>
    </Tappable>
  );
}
