import { View } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Divider } from './ui/bits';
import { Button } from './ui/Button';
import { Icon, type IconName } from './ui/Icon';
import { T } from './ui/T';

/** The Alert's parts (parent P15 and therapist T09): a labelled fact with a divider, and an action row with a small outline button. */
export function Fact({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <View style={{ gap: space.xs, paddingVertical: space.md }}>
      <T v="bodySm" color="textMuted">
        {label}
      </T>
      {typeof children === 'string' ? <T v="bodyLg">{children}</T> : children}
      {last ? null : <View style={{ marginTop: space.md }}><Divider /></View>}
    </View>
  );
}

export function ActionRow({ icon, title, sub, action, onPress, label }: { icon: IconName; title: string; sub?: string; action: string; onPress: () => void; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
      <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: c.surfaceTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={c.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="bodyLg">{title}</T>
        {sub ? (
          <T v="caption" color="textMuted">
            {sub}
          </T>
        ) : null}
      </View>
      <Button title={action} size="small" variant="outline" label={label} onPress={onPress} />
    </View>
  );
}

