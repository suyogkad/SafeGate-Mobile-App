import { View } from 'react-native';
import { FACES, type FaceName } from '../data/faces';
import { artTints, space } from '../theme/tokens';
import { FaceCircle } from './ui/bits';
import { Card } from './ui/Card';
import { T } from './ui/T';

/**
 * What a screen shows when the thing it is for has no backend yet.
 *
 * SafeGate would rather show a parent a blank than a plausible invention. A made-up
 * mood or journal entry reads as something their child actually said, and a parent
 * may act on it — so these screens say plainly that nothing is recorded, and what
 * will fill them in.
 */
export function NotRecordedYet({
  title,
  line,
  face = 'monocleWave',
  tint = artTints.blue,
}: {
  title: string;
  line: string;
  face?: FaceName;
  tint?: string;
}) {
  return (
    <Card tone="raised" r={24} padding={space.xl}>
      <View style={{ alignItems: 'center', gap: space.md }}>
        <FaceCircle face={FACES[face]} tint={tint} size={80} />
        <T v="heading" center>
          {title}
        </T>
        <T v="body" color="textSecondary" center>
          {line}
        </T>
      </View>
    </Card>
  );
}
