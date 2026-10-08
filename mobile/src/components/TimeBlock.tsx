import { View } from 'react-native';
import { CLIENTS } from '../data/practice';
import { dayLabel, rangeLabel, type Block } from '../lib/schedule';
import { radius, size, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Badge } from './ui/Badge';
import { Avatar } from './ui/bits';
import { Icon } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * One calendar block as a full-width row, made of the list row + badge + avatar:
 *  booked → the child's initial (navy), name, VIDEO CALL / IN PERSON badge · open → a dashed edge and "Open" ·
 *  away / off → a grey row with the word. Every kind says what it is in words; colour is never the only signal.
 */
export function TimeBlock({ block, childName, onPress }: { block: Block; childName: string; onPress?: () => void }) {
  const { c } = useTheme();

  if (block.type === 'away' || block.type === 'off') {
    const text = block.type === 'away' ? `Away · ${block.label}` : 'Off · not a working day';
    return (
      <View
        accessible
        accessibilityLabel={`${dayLabel(block.date)}. ${text}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: size.touch, paddingHorizontal: space.lg, borderRadius: radius.tile, backgroundColor: c.chip }}
      >
        <Icon name={block.type === 'away' ? 'sun' : 'moon'} size={20} color={c.textSecondary} />
        <T v="bodyLg" color="textSecondary">
          {text}
        </T>
      </View>
    );
  }

  const time = rangeLabel(block.start, block.end);
  const [from, to] = time.split(' – ');
  const timeCol = (
    <View style={{ width: 64 }}>
      <T v="bodySmMedium">{from}–</T>
      <T v="bodySm" color="textMuted">
        {to}
      </T>
    </View>
  );

  if (block.type === 'booked') {
    const b = block.booking;
    // Real bookings bring their own name; a real client id is not in CLIENTS.
    const who = b.clientName ?? (b.clientId === 'alex' ? childName : CLIENTS[b.clientId]?.name) ?? 'Client';
    return (
      <Tappable
        label={`${dayLabel(block.date)}, ${time.replace('–', 'to')}. ${who}, ${b.kind.toLowerCase()}. Open session`}
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: size.touch + space.sm, paddingHorizontal: space.md, paddingVertical: space.sm }}
      >
        {timeCol}
        <Avatar initials={who.charAt(0)} size={36} tone="brand" />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="section">{who}</T>
          <Badge label={b.kind.toUpperCase()} tone="info" />
        </View>
        <Icon name="chevron-right" size={20} color={c.textMuted} />
      </Tappable>
    );
  }

  return (
    <Tappable
      label={`${dayLabel(block.date)}, ${time.replace('–', 'to')}. Open time${block.kind ? `, ${block.kind.toLowerCase()} only` : ''}. Change or remove`}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: size.touch,
        paddingHorizontal: space.md,
        borderRadius: radius.tile,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: c.chipBorder,
      }}
    >
      {timeCol}
      <View style={{ flex: 1 }}>
        <T v="section" color="brand">
          Open
        </T>
        {block.kind ? (
          <T v="bodySm" color="textMuted">
            {block.kind} only
          </T>
        ) : null}
      </View>
      <Icon name="edit-2" size={18} color={c.brand} />
    </Tappable>
  );
}
