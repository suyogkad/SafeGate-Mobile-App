import { Image, View } from 'react-native';
import { FACES, type FaceName } from '../data/faces';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * Welcome collage: a crowd of characters on a pale blue arc, arranged from the individual faces.
 * Still and decorative.
 */
const LAYOUT: { face: FaceName; size: number; left: `${number}%`; top: number; rotate: string }[] = [
  { face: 'monocleWave', size: 88, left: '2%', top: 30, rotate: '-8deg' },
  { face: 'smilePillPink', size: 78, left: '30%', top: 4, rotate: '6deg' },
  { face: 'crownEgg', size: 74, left: '52%', top: 30, rotate: '-4deg' },
  { face: 'smileFlower', size: 88, left: '72%', top: 0, rotate: '10deg' },
  { face: 'smileBlobCyan', size: 70, left: '20%', top: 108, rotate: '4deg' },
  { face: 'coolArch', size: 92, left: '44%', top: 100, rotate: '0deg' },
  { face: 'smileFlowerAmber', size: 76, left: '74%', top: 98, rotate: '-6deg' },
];

export function FaceCollage({ height = 180 }: { height?: number }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height, overflow: 'hidden', borderRadius: radius.panel }}
    >
      <View
        style={{
          position: 'absolute',
          left: '-20%',
          right: '-20%',
          top: height * 0.28,
          height: height * 2,
          borderRadius: radius.pill,
          backgroundColor: c.surfaceTint,
        }}
      />
      {LAYOUT.map((f) => (
        <Image
          key={f.face}
          source={FACES[f.face]}
          resizeMode="contain"
          style={{ position: 'absolute', width: f.size, height: f.size, left: f.left, top: f.top, transform: [{ rotate: f.rotate }] }}
        />
      ))}
    </View>
  );
}
