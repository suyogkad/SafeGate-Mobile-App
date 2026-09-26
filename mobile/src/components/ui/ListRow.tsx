import type { ReactNode } from 'react';
import { View } from 'react-native';
import { size, space } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Badge, type BadgeTone } from './Badge';
import { Icon, type IconName } from './Icon';
import { T } from './T';
import { Tappable } from './Tappable';

type Props = {
  title: string;
  subtitle?: string;
  /** small tag pill (e.g. "CHECK IN") */
  tag?: string;
  tagTone?: BadgeTone;
  /** value shown on the right in primary colour ("Bigger") */
  value?: string;
  left?: ReactNode;
  emoji?: string;
  icon?: IconName;
  right?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  label?: string;
  divider?: boolean;
};

/** Label/value rows and list rows with tag + chevron. */
export function ListRow({ title, subtitle, tag, tagTone = 'info', value, left, emoji, icon, right, chevron, onPress, label, divider }: Props) {
  const { c } = useTheme();
  const body = (
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
      {left}
      {emoji ? <T v="heading">{emoji}</T> : null}
      {icon ? <Icon name={icon} size={24} color={c.text} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyLg">{title}</T>
        {subtitle ? (
          <T v="bodySm" color="textMuted">
            {subtitle}
          </T>
        ) : null}
        {tag ? (
          <View style={{ marginTop: space.xs }}>
            <Badge label={tag} tone={tagTone} />
          </View>
        ) : null}
      </View>
      {value ? (
        <T v="bodyLg" color="primary">
          {value}
        </T>
      ) : null}
      {right}
      {chevron ? <Icon name="chevron-right" size={20} color={c.textMuted} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Tappable label={label ?? [title, value].filter(Boolean).join(', ')} onPress={onPress}>
      {body}
    </Tappable>
  );
}
