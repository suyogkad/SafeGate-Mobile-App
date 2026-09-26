import { useState, type ReactNode } from 'react';
import { Platform, Pressable, View, type LayoutChangeEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors, size } from '../../theme/tokens';

type Props = Omit<PressableProps, 'style' | 'accessibilityLabel' | 'children'> & {
  children?: ReactNode;
  /** Required: every interactive element is labelled. */
  label: string;
  style?: StyleProp<ViewStyle>;
  /** Visual height, used to grow the hit area to 56 dp before the first layout. */
  visualHeight?: number;
  selected?: boolean;
  role?: 'button' | 'link' | 'tab' | 'checkbox' | 'switch' | 'radio';
  checked?: boolean;
};

/** Web hit layer offset: half of whatever the side is short of 56 dp, outwards; 0 when it's already big enough. */
const GROW = `min(0px, calc((100% - ${size.touch}px) / 2))` as unknown as number;

type Slop = { top: number; bottom: number; left: number; right: number };

/** How far to grow each side so the hit area is at least 56 × 56 dp (product rule 8). */
function slopFor(w: number, h: number): Slop | undefined {
  const v = h < size.touch ? Math.ceil((size.touch - h) / 2) : 0;
  const x = w < size.touch ? Math.ceil((size.touch - w) / 2) : 0;
  return v || x ? { top: v, bottom: v, left: x, right: x } : undefined;
}

/**
 * Pressable with a label, a 56 dp hit area, a visible focus ring and a quiet pressed state.
 * The hit area grows to 56 dp around smaller pills, on both axes: `hitSlop` from the measured size on native; React
 * Native Web ignores `hitSlop`, so on web it's an invisible layer inside the pressable that reaches past its edges.
 */
export function Tappable({ label, style, visualHeight, selected, role = 'button', checked, disabled, children, onLayout, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [slop, setSlop] = useState<Slop | undefined>(() => (visualHeight ? slopFor(size.touch, visualHeight) : undefined));
  const web = Platform.OS === 'web';

  const measure = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const next = slopFor(width, height);
    setSlop((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    onLayout?.(e);
  };

  return (
    <Pressable
      accessibilityRole={role}
      // Labels are often joined with ". " after text that already ends in punctuation ("…steps.. Open", "…about?. Open").
      accessibilityLabel={label.replace(/([.!?…])\s*\.(?=\s|$)/g, '$1')}
      accessibilityState={{ disabled: !!disabled, selected, checked }}
      // RN Web only emits the aria-* forms, so selected / checked states reach screen readers in the browser too.
      aria-disabled={!!disabled}
      aria-selected={role === 'tab' ? !!selected : undefined}
      aria-checked={role === 'checkbox' || role === 'radio' || role === 'switch' ? !!checked : undefined}
      hitSlop={web ? undefined : slop}
      disabled={disabled}
      onLayout={web ? onLayout : measure}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        style,
        pressed && !disabled && { opacity: 0.8 },
        focused && web && {
          // Web focus ring: 3 px, 2 px offset (checklist 2.2.2)
          outlineStyle: 'solid' as never,
          outlineWidth: 3,
          outlineColor: colors.focus,
          outlineOffset: 2,
        },
      ]}
      {...rest}
    >
      {web ? (
        // Grows each side only when that side is under 56 (percentages are of this pressable's own box), no measuring.
        <View aria-hidden style={{ pointerEvents: 'auto', position: 'absolute', top: GROW, bottom: GROW, left: GROW, right: GROW } as ViewStyle} />
      ) : null}
      {children}
    </Pressable>
  );
}
