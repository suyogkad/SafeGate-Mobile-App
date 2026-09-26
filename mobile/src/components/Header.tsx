import type { ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { gutter, size, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { GetHelpButton } from './GetHelpButton';
import { IconButton } from './ui/IconButton';
import { T } from './ui/T';

type Props = {
  title?: string;
  /** left action. `back`/`close` go back, or to `fallback` when there is no history (e.g. after a reload). */
  left?: 'back' | 'close' | 'none';
  onLeft?: () => void;
  fallback?: Href;
  /** child screens show Get help top-right. Pass false only on Get help itself and in the parent area. */
  getHelp?: boolean | 'compact';
  right?: ReactNode;
  /** transparent header over a coloured band */
  onBrand?: boolean;
};

export function goBack(fallback: Href = '/home') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * Nav bar: 48 h, centred title, icon left, action right.
 * SafeGate: the right slot belongs to Get help on child screens, so ✕ lives on the left.
 */
export function Header({ title, left = 'back', onLeft, fallback, getHelp = true, right, onBrand }: Props) {
  const { c } = useTheme();
  const leftIcon = left === 'close' ? 'x' : 'chevron-left';
  const leftLabel = left === 'close' ? 'Close' : 'Back';
  const handleLeft = onLeft ?? (() => goBack(fallback));
  const rightSlot = right ?? (getHelp ? <GetHelpButton compact={getHelp === 'compact'} /> : null);
  return (
    <View
      style={{
        minHeight: size.navBar + space.sm,
        paddingHorizontal: gutter - space.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
      }}
    >
      <View style={{ minWidth: 48, alignItems: 'flex-start' }}>
        {left !== 'none' ? <IconButton icon={leftIcon} label={leftLabel} variant="plain" onPress={handleLeft} /> : null}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title ? (
          // Two lines, not one: at Biggest text a one-line title got cut to "About Safe…" (checklist 1.4.5, no loss of content).
          <T v="navTitle" tint={onBrand ? c.onBrand : undefined} numberOfLines={2} center header>
            {title}
          </T>
        ) : null}
      </View>
      <View style={{ minWidth: 48, alignItems: 'flex-end', paddingRight: space.sm }}>{rightSlot}</View>
    </View>
  );
}
