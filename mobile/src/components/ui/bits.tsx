import type { ReactNode } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { radius, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { T } from './T';
import { Button } from './Button';

/** Avatar — SafeGate uses initials, never photos of people in the child app. */
export function Avatar({ initials, size = 48, tone = 'tint' }: { initials: string; size?: number; tone?: 'tint' | 'brand' }) {
  const { c } = useTheme();
  const bg = tone === 'brand' ? c.brand : c.surfaceTint;
  const fg = tone === 'brand' ? c.onBrand : c.brand;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: radius.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <T v="section" tint={fg} allowFontScaling={false} style={{ fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.46) }}>
        {initials}
      </T>
    </View>
  );
}

/** "Today's Check In" + optional text action ("See All", "Edit"). */
export function SectionHeader({ title, action, onAction, actionLabel, big }: { title: string; action?: string; onAction?: () => void; actionLabel?: string; big?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
      <T v={big ? 'heading' : 'section'} header style={{ flex: 1 }}>
        {title}
      </T>
      {action ? <Button title={action} variant="text" label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

/** Full-width progress bar: 4 h, grey200 track, blue500 fill. */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{ height: 4, borderRadius: radius.pill, backgroundColor: c.track, overflow: 'hidden' }}
    >
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', backgroundColor: c.primary, borderRadius: radius.pill }} />
    </View>
  );
}

/** Step dashes + "Step N of M" (checklist: dashes, not a filling bar). */
export function StepDashes({ step, total, showText = true }: { step: number; total: number; showText?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm }} accessible accessibilityLabel={`Step ${step} of ${total}`}>
      <View style={{ flexDirection: 'row', gap: space.xs }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: i < step ? c.primary : c.track }} />
        ))}
      </View>
      {showText ? (
        // textSecondary, not textMuted: this sits on mood tints too, where muted grey fails contrast (HANDOFF.md §6.2).
        <T v="caption" color="textSecondary">
          Step {step} of {total}
        </T>
      ) : null}
    </View>
  );
}

/** A character face inside a tinted circle (check-in cards: 101 circle, ~70 face). */
export function FaceCircle({ face, tint, size = 101, label }: { face: ImageSourcePropType; tint?: string; size?: number; label?: string }) {
  const { c } = useTheme();
  return (
    <View
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={{ width: size, height: size, borderRadius: radius.pill, backgroundColor: tint ?? c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}
    >
      <Image source={face} resizeMode="contain" style={{ width: size * 0.7, height: size * 0.7 }} />
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.divider, marginHorizontal: inset }} />;
}

export function Stack({ children, gap = space.lg, style }: { children: ReactNode; gap?: number; style?: object }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}
