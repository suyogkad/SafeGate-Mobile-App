import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import { radius, size, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * A button that looks like a text field (pill-shaped).
 * Child Home "Chat with AI" (sparkle) and Parent Home "Search therapists or help" (search).
 */
export function FakeField({
  text,
  onPress,
  icon,
  sparkle,
  label,
}: {
  text: string;
  onPress: () => void;
  icon?: IconName;
  sparkle?: boolean;
  label?: string;
}) {
  const { c } = useTheme();
  return (
    <Tappable
      label={label ?? text}
      onPress={onPress}
      visualHeight={size.field}
      style={{
        flex: 1,
        minHeight: size.field,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: c.fieldBorder,
        backgroundColor: c.bg,
        paddingHorizontal: space.lg,
        justifyContent: 'center',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {sparkle ? (
          <MaterialCommunityIcons name="star-four-points-outline" size={20} color={c.primary} accessibilityElementsHidden importantForAccessibility="no" />
        ) : icon ? (
          <Icon name={icon} size={20} color={c.textMuted} />
        ) : null}
        <T v="body" color={sparkle ? 'text' : 'textMuted'} numberOfLines={1} style={{ flex: 1 }}>
          {text}
        </T>
      </View>
    </Tappable>
  );
}
