import { Image, View, type ImageSourcePropType } from 'react-native';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * A therapist's photo in a circle, with a white ring so it reads on navy panels and photos alike. Therapist side
 * only (the child app and the parent area use initials). Decorative: the name next to it is the label.
 */
export function PhotoAvatar({ photo, size = 64 }: { photo: ImageSourcePropType; size?: number }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: radius.pill, borderWidth: 2, borderColor: c.bg, overflow: 'hidden', backgroundColor: c.surfaceTint }}
    >
      <Image source={photo} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}
