import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gutter, shadow, space, type BackdropName } from '../theme/tokens';
import { Backdrop } from './Backdrop';
import { useTheme } from '../theme/useTheme';

type Props = {
  children: ReactNode;
  /** nav bar (Header) — sits above the scroll area */
  header?: ReactNode;
  /** sticky bottom action bar */
  footer?: ReactNode;
  scroll?: boolean;
  /** screen background: white by default; tints for Get help / moods */
  bg?: string;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** tab roots: no bottom inset (the tab bar handles it) */
  inTabs?: boolean;
  /** content starts at the very top edge (full-bleed hero under the status bar) */
  edgeToEdge?: boolean;
  /** branded page background (HANDOFF.md §6.6). Default `soft`; `none` = plain white. */
  backdrop?: BackdropName | 'none';
  /** keep the background still whatever the motion settings (calm mode) */
  stillBackdrop?: boolean;
};

/** Page shell: safe area, 24 px gutter, optional sticky bottom bar. */
export function Screen({
  children,
  header,
  footer,
  scroll = true,
  bg,
  padded = true,
  contentStyle,
  inTabs,
  edgeToEdge,
  backdrop = 'soft',
  stillBackdrop,
}: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const background = bg ?? c.bg;
  const pad: ViewStyle = {
    paddingHorizontal: padded ? gutter : 0,
    paddingTop: edgeToEdge ? 0 : space.lg,
    paddingBottom: footer || inTabs ? space.xl : space.xl + insets.bottom,
    gap: space.xl,
  };
  return (
    <View style={{ flex: 1, backgroundColor: background, paddingTop: edgeToEdge ? 0 : insets.top }}>
      {backdrop !== 'none' ? <Backdrop name={backdrop} still={stillBackdrop} /> : null}
      {header}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[pad, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
      )}
      {footer ? <StickyBar>{footer}</StickyBar> : null}
    </View>
  );
}

export function StickyBar({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          backgroundColor: c.bg,
          paddingHorizontal: gutter,
          paddingTop: space.lg,
          paddingBottom: space.lg + insets.bottom,
          gap: space.md,
        },
        shadow.bar,
      ]}
    >
      {children}
    </View>
  );
}
