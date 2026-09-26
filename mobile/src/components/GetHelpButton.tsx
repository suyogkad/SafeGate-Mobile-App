import { router } from 'expo-router';
import { View } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * [GH] Get help — same place (top-right of the header) on every child screen, including calm mode and errors.
 * Amber help tint with dark amber text: easy to find, quieter than a solid fill, never red.
 * The solid amber fill is kept for the emergency action itself (Call 000).
 * `onBrand` sits on the navy hero (white pill so it still reads).
 */
export function GetHelpButton({ compact, onBrand }: { compact?: boolean; onBrand?: boolean }) {
  const { c } = useTheme();
  const open = () => router.push('/get-help');
  const bg = onBrand ? c.bg : c.helpTint;
  if (compact) {
    return (
      <Tappable
        label="Get help"
        onPress={open}
        visualHeight={40}
        style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="life-buoy" size={22} color={c.onHelpTint} />
      </Tappable>
    );
  }
  return (
    <Tappable
      label="Get help"
      onPress={open}
      visualHeight={36}
      style={{ height: 36, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: bg, justifyContent: 'center' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
        <Icon name="life-buoy" size={16} color={c.onHelpTint} />
        <T v="bodySmMedium" tint={c.onHelpTint} allowFontScaling={false} style={{ fontSize: 14, lineHeight: 20, letterSpacing: 0 }}>
          Get help
        </T>
      </View>
    </Tappable>
  );
}
