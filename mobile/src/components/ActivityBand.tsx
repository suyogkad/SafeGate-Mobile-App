import { Image, View } from 'react-native';
import { type CalmActivity } from '../data/calm';
import { FACES } from '../data/faces';
import { artTints, radius, space } from '../theme/tokens';
import { Badge } from './ui/Badge';

/**
 * The visual band on calm activity cards and the Calm activity hero — a hero band at card size:
 * a tinted band with the activity's character peeking in from the right, and an "N STEPS" tag.
 * Still: nothing moves here (calm screens stay quiet).
 */
export function ActivityBand({ activity, height = 112, rounded = 'top' }: { activity: CalmActivity; height?: number; rounded?: 'top' | 'all' }) {
  const r = radius.panel;
  return (
    <View
      style={{
        height,
        backgroundColor: artTints[activity.art.tint],
        borderTopLeftRadius: r,
        borderTopRightRadius: r,
        borderBottomLeftRadius: rounded === 'all' ? r : 0,
        borderBottomRightRadius: rounded === 'all' ? r : 0,
        overflow: 'hidden',
        padding: space.lg,
      }}
    >
      <Image
        source={FACES[activity.art.face]}
        resizeMode="contain"
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ position: 'absolute', right: -14, bottom: -height * 0.18, width: height * 1.05, height: height * 1.05, transform: [{ rotate: '-8deg' }] }}
      />
      <Badge label={`${activity.steps.length} STEPS`} tone="brand" />
    </View>
  );
}
