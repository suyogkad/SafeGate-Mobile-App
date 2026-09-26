import { router, type Href } from 'expo-router';
import { Image, View } from 'react-native';
import { FACES } from '../data/faces';
import type { Therapist } from '../data/therapists';
import { useNextFree } from '../store/app';
import { artTints, radius, shadow, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Badge } from './ui/Badge';
import { Avatar } from './ui/bits';
import { Icon } from './ui/Icon';
import { T } from './ui/T';
import { Tappable } from './ui/Tappable';

/**
 * Therapist row as a raised card: avatar (with the therapist's character), name, blurb, "NEXT FREE" badge.
 * Used on Find a therapist and, as "What families see", in the therapist's My hours. Priya's next free time is
 * worked out from her hours, so it changes as soon as she changes them.
 */
export function TherapistCard({ t, href }: { t: Therapist; href?: Href }) {
  const { c } = useTheme();
  const next = useNextFree(t);
  const badge = next ? `NEXT FREE: ${next}` : 'NO FREE TIMES YET';
  return (
    <Tappable
      label={`${t.name}. ${t.blurb}. ${next ? `Next free ${next}` : 'No free times yet'}. Open profile`}
      onPress={() => router.push(href ?? (`/parent/therapist?id=${t.id}` as Href))}
      style={{ backgroundColor: c.bg, borderRadius: radius.panel, padding: space.lg, ...shadow.lift }}
    >
      <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
        <View>
          <Avatar initials={t.initials} size={64} />
          <View
            style={{
              position: 'absolute',
              right: -8,
              bottom: -6,
              width: 32,
              height: 32,
              borderRadius: radius.pill,
              backgroundColor: artTints[t.art.tint],
              borderWidth: 2,
              borderColor: c.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image source={FACES[t.art.face]} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" style={{ width: 20, height: 20 }} />
          </View>
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <Badge label={badge} tone={next ? 'success' : 'neutral'} />
          <T v="section">{t.name}</T>
          <T v="bodySm" color="textSecondary">
            {t.blurb}
          </T>
        </View>
        <Icon name="chevron-right" size={20} color={c.textMuted} />
      </View>
    </Tappable>
  );
}
