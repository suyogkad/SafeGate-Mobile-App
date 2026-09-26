import { View } from 'react-native';
import { radius, size, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Icon } from './Icon';
import { T } from './T';
import { Tappable } from './Tappable';

/**
 * Switch, in the pill + circle language:
 * 52×32 track, grey200 off / blue500 on, white 28 knob. "On" also shows a tick (colour is never the only signal).
 */
export function SwitchVisual({ on }: { on: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 52,
        height: 32,
        borderRadius: radius.pill,
        backgroundColor: on ? c.primary : c.track,
        padding: 2,
        alignItems: on ? 'flex-end' : 'flex-start',
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: radius.pill,
          backgroundColor: c.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {on && <Icon name="check" size={16} color={c.primary} />}
      </View>
    </View>
  );
}

export function SwitchRow({
  title,
  subtitle,
  on,
  onToggle,
  divider = true,
  emoji,
}: {
  /** a picture before the title (the same ones as Book's how-to-meet rows); not read out */
  emoji?: string;
  title: string;
  subtitle?: string;
  on: boolean;
  onToggle: () => void;
  divider?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Tappable label={title} role="switch" checked={on} onPress={onToggle}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          minHeight: size.touch,
          paddingVertical: space.md,
          borderBottomWidth: divider ? 1 : 0,
          borderBottomColor: c.divider,
        }}
      >
        {emoji ? (
          // the same 44 tinted circle as the answer rows (Book's how-to-meet)
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
            style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}
          >
            <T v="heading" allowFontScaling={false} style={{ fontSize: 22, lineHeight: 28 }}>
              {emoji}
            </T>
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyLg">{title}</T>
          {subtitle ? (
            <T v="bodySm" color="textMuted">
              {subtitle}
            </T>
          ) : null}
        </View>
        <SwitchVisual on={on} />
      </View>
    </Tappable>
  );
}
