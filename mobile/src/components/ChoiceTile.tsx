import { View, type ImageSourcePropType } from 'react-native';
import { radius, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { FaceCircle } from './ui/bits';
import { Icon } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * A big, full-width choice (Welcome "I'm a kid" / "I'm a parent or carer").
 * The check-in card language (grey50, radius 16, face in a tinted circle) laid out as a row.
 */
export function ChoiceTile({
  title,
  hint,
  face,
  tint,
  onPress,
}: {
  title: string;
  hint: string;
  face: ImageSourcePropType;
  tint?: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Tappable
      label={`${title}. ${hint}`}
      onPress={onPress}
      style={{ backgroundColor: c.surface, borderRadius: radius.card, padding: space.lg, minHeight: 96, justifyContent: 'center' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <FaceCircle face={face} tint={tint} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="heading">{title}</T>
          <T v="bodySm" color="textMuted">
            {hint}
          </T>
        </View>
        <Icon name="chevron-right" size={22} color={c.textMuted} />
      </View>
    </Tappable>
  );
}
