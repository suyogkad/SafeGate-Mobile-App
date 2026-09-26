import type { ReactNode } from 'react';
import { View } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const DOT = 20;
const GAP = space.lg;

/**
 * Timeline: 20 px navy dots joined by a 1 px navy line,
 * cards to the right. A gentle order of things — not a progress meter.
 */
export function Timeline({ children }: { children: ReactNode[] }) {
  const items = children.filter(Boolean);
  return (
    <View>
      {items.map((child, i) => (
        <TimelineRow key={i} first={i === 0} last={i === items.length - 1}>
          {child}
        </TimelineRow>
      ))}
    </View>
  );
}

function TimelineRow({ children, first, last }: { children: ReactNode; first: boolean; last: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: space.md, paddingBottom: last ? 0 : GAP }}>
      <View style={{ width: DOT, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {!first && <View style={{ position: 'absolute', top: 0, height: '50%', width: 1, backgroundColor: c.brand }} />}
        {!last && <View style={{ position: 'absolute', top: '50%', bottom: -GAP, width: 1, backgroundColor: c.brand }} />}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ width: DOT, height: DOT, borderRadius: radius.pill, backgroundColor: c.brand }} />
        </View>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
