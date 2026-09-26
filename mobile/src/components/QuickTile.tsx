import { View } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/** Tile: grey50, radius 12, icon in a blue50 circle, label below. */
export function QuickTile({ title, icon, onPress }: { title: string; icon: IconName; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Tappable
      label={title}
      onPress={onPress}
      style={{ flex: 1, minHeight: 112, backgroundColor: c.surface, borderRadius: radius.tile, padding: space.lg, gap: space.md }}
    >
      <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={22} color={c.brand} />
      </View>
      <T v="bodyLg">{title}</T>
    </Tappable>
  );
}

/** Two-column grid. */
export function TileGrid({ children }: { children: React.ReactNode[] }) {
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
