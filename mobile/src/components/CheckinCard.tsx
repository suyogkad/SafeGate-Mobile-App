import type { ReactNode } from 'react';
import { View } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * Check-in card (grey50, radius 16, padding 12/24).
 * Left: grey caption on top ("Fri, Jul 26 · 3:03 PM"), then a small label ("Feeling") and an 18 px coloured word.
 * Right: a character in a tinted circle (or an avatar).
 */
export function CheckinCard({
  caption,
  label,
  title,
  titleColor,
  right,
  done,
  onPress,
  a11yLabel,
}: {
  caption: string;
  label?: string;
  title: string;
  titleColor?: string;
  right?: ReactNode;
  /** quiet "done" tick (child Home) — no celebration, no count */
  done?: boolean;
  onPress?: () => void;
  a11yLabel?: string;
}) {
  const { c } = useTheme();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1, gap: space.md, paddingVertical: space.xs }}>
        <T v="caption" color="textMuted">
          {caption}
        </T>
        <View style={{ gap: 2 }}>
          {label ? <T v="caption">{label}</T> : null}
          <T v="mood" tint={titleColor ?? c.brand}>
            {title}
          </T>
          {done ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Icon name="check" size={14} color={c.textMuted} />
              <T v="caption" color="textMuted">
                done
              </T>
            </View>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  );
  const style = { backgroundColor: c.surface, borderRadius: radius.card, paddingVertical: space.md, paddingLeft: space.xl - 4, paddingRight: space.md };
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Tappable label={a11yLabel ?? `${label ? label + ' ' : ''}${title}. ${caption}${done ? '. Done today' : ''}`} onPress={onPress} style={style}>
      {body}
    </Tappable>
  );
}
