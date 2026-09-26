import { View } from 'react-native';
import { radius, shadow, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * Answer choices for question screens (About your child, check-ins).
 * The chip + check-in card language: white card lifted off the branded background, an emoji in a
 * tinted circle, and a clear selected state — blue border, blue50 fill AND a tick/radio mark (never colour alone).
 */
export function OptionRow({
  label,
  emoji,
  selected,
  multi,
  onPress,
}: {
  label: string;
  emoji?: string;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Tappable
      label={label}
      role={multi ? 'checkbox' : 'radio'}
      checked={selected}
      selected={selected}
      onPress={onPress}
      style={[
        {
          minHeight: 64,
          borderRadius: radius.card,
          borderWidth: 2,
          borderColor: selected ? c.primary : 'transparent',
          backgroundColor: selected ? c.surfaceTint : c.bg,
          paddingVertical: space.sm + 2,
          paddingHorizontal: space.md,
          justifyContent: 'center',
        },
        selected ? null : shadow.lift,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        {emoji ? (
          <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: selected ? c.bg : c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
            <T v="heading" allowFontScaling={false} style={{ fontSize: 22, lineHeight: 28 }}>
              {emoji}
            </T>
          </View>
        ) : null}
        <T v="bodyLg" style={{ flex: 1 }}>
          {label}
        </T>
        <Mark selected={selected} multi={multi} />
      </View>
    </Tappable>
  );
}

/** Square-ish tile for multi-select grids ("What tends to be hard?", "What's going on?"). */
export function OptionTile({ label, emoji, selected, onPress }: { label: string; emoji: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Tappable
      label={label}
      role="checkbox"
      checked={selected}
      selected={selected}
      onPress={onPress}
      style={[
        {
          flex: 1,
          minHeight: 116,
          borderRadius: radius.card,
          borderWidth: 2,
          borderColor: selected ? c.primary : 'transparent',
          backgroundColor: selected ? c.surfaceTint : c.bg,
          padding: space.md,
          gap: space.sm,
        },
        selected ? null : shadow.lift,
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: selected ? c.bg : c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
          <T v="heading" allowFontScaling={false} style={{ fontSize: 24, lineHeight: 30 }}>
            {emoji}
          </T>
        </View>
        <Mark selected={selected} multi />
      </View>
      <T v="bodySmMedium">{label}</T>
    </Tappable>
  );
}

/** Radio dot (single) or tick box (multi). */
function Mark({ selected, multi }: { selected: boolean; multi?: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: multi ? 7 : radius.pill,
        borderWidth: 2,
        borderColor: selected ? c.primary : c.track,
        backgroundColor: selected ? c.primary : c.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected ? multi ? <Icon name="check" size={14} color={c.onPrimary} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.onPrimary }} /> : null}
    </View>
  );
}

/** Two-column grid of tiles. */
export function TileRows({ children }: { children: React.ReactNode[] }) {
  const rows: React.ReactNode[][] = [];
  children.forEach((ch, i) => (i % 2 === 0 ? rows.push([ch]) : rows[rows.length - 1].push(ch)));
  return (
    <View style={{ gap: space.md }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
          {r}
          {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
