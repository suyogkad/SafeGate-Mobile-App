/**
 * P11 Therapist profile. A navy header with large initials and the therapist's character
 * (no photos), then intro, years with kids, "Good fit for", "Ways to meet", and a sticky
 * "Book a session". No prices, no ratings, no testimonials.
 *
 * Everything comes from what the therapist wrote about themselves. "Ways to meet" says
 * only what they actually offer: in person appears when they see families and have given
 * a clinic address, because sending a family somewhere that isn't there is worse than
 * offering video alone.
 *
 * ?preview=1 is the therapist's own "See it as families do", from Your profile: the same
 * page without the Book button and without the character.
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { Appear, Stagger } from '@/components/ui/Appear';
import { Avatar, Divider } from '@/components/ui/bits';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { T } from '@/components/ui/T';
import { characterFor } from '@/lib/character';
import { useTherapistProfile } from '@/lib/family';
import { useMe } from '@/lib/therapist';
import { initialsOf } from '@/lib/time';
import { gutter, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function TherapistProfile() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; preview?: string }>();
  const preview = params.preview === '1';

  // In preview the therapist is reading their own unpublished draft, so it has to
  // come from their own record, not from the directory. A parent never asks for it:
  // /therapist/me is therapist-only and would 403 on every open.
  const { me } = useMe(preview);
  const { therapist: fromDirectory, loading } = useTherapistProfile(preview ? undefined : params.id);

  const t = preview
    ? me && {
        id: me.id,
        full_name: me.full_name,
        title: me.title,
        years_with_kids: me.years_with_kids,
        blurb: me.blurb,
        tagline: me.tagline,
        about: me.about,
        good_for: me.good_for,
        clinic: me.clinic,
        offers_video: me.hours.offers_video,
        offers_in_person: me.hours.offers_in_person && !!me.clinic,
        session_length_min: me.hours.session_length_min,
      }
    : fromDirectory;

  if (!t) {
    return (
      <Screen backdrop="brand">
        <Card tone="raised" padding={space.lg}>
          <T v="bodyLg" color="textSecondary">
            {loading || preview ? 'Loading…' : 'This therapist is not available right now.'}
          </T>
        </Card>
      </Screen>
    );
  }

  const art = characterFor(t.id);
  const inPerson = t.offers_in_person && t.clinic;
  const ways: { icon: IconName; title: string; line: string }[] = [
    ...(t.offers_video
      ? [{ icon: 'video' as IconName, title: 'Video call', line: `About ${t.session_length_min} minutes, from home` }]
      : []),
    ...(inPerson
      ? [{ icon: 'map-pin' as IconName, title: 'In person', line: `${t.clinic!.name} · ${t.clinic!.address}` }]
      : [{ icon: 'video' as IconName, title: 'Video only for now', line: 'No in-person times at the moment' }]),
    { icon: 'users', title: 'Parent check-in', line: 'A few minutes with you at the start or end' },
    { icon: 'file-text', title: 'Notes after sessions', line: 'What went well, and things to try at home' },
  ];

  return (
    <Screen
      padded={false}
      edgeToEdge
      backdrop="brand"
      footer={
        preview ? undefined : (
          <Button title="Book a session" icon="arrow-right" onPress={() => router.push(`/parent/book?id=${t.id}` as Href)} />
        )
      }
    >
      <StatusBar style="light" />
      <View
        style={{
          backgroundColor: c.brand,
          paddingTop: insets.top,
          overflow: 'hidden',
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        {preview ? null : (
          <Image
            source={art.face}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ position: 'absolute', right: -40, top: insets.top + 10, width: 210, height: 210, opacity: 0.95, transform: [{ rotate: '-10deg' }] }}
          />
        )}
        <View style={{ paddingHorizontal: gutter - space.sm, paddingTop: space.sm }}>
          <IconButton
            icon="chevron-left"
            label="Back"
            variant="soft"
            onPress={() => goBack(preview ? '/therapist/account' : '/parent/find-therapist')}
          />
        </View>
        <View style={{ padding: gutter, paddingTop: space.xxl, gap: space.md }}>
          <Avatar initials={initialsOf(t.full_name) || '?'} size={88} />
          <View style={{ gap: space.xs }}>
            <T v="title" color="onBrand" header>
              {t.full_name}
            </T>
            {t.title ? (
              <T v="bodyLg" color="onBrand" style={{ opacity: 0.9 }}>
                {t.title}
              </T>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: gutter, gap: space.xl }}>
        <Appear>
          <Card tone="raised" r={24} padding={space.lg}>
            <View style={{ gap: space.md }}>
              {t.years_with_kids ? (
                <Badge
                  label={`${t.years_with_kids} ${t.years_with_kids === 1 ? 'YEAR' : 'YEARS'} WITH KIDS`}
                  tone="brand"
                />
              ) : null}
              {t.tagline ? <T v="bodyLg">{t.tagline}</T> : null}
              {t.tagline && t.about ? <Divider /> : null}
              {t.about ? (
                <T v="body" color="textSecondary">
                  {t.about}
                </T>
              ) : null}
              {!t.tagline && !t.about ? (
                <T v="body" color="textSecondary">
                  {preview
                    ? 'Add a headline and a few words about you in Your profile.'
                    : `${t.full_name} hasn’t written their introduction yet.`}
                </T>
              ) : null}
            </View>
          </Card>
        </Appear>

        {t.good_for.length ? (
          <View style={{ gap: space.md }}>
            <T v="section" header>
              Good fit for
            </T>
            <Card tone="raised" padding={space.lg}>
              <View style={{ gap: space.md }}>
                <Stagger>
                  {t.good_for.map((g) => (
                    <View key={g.text} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: radius.pill,
                          backgroundColor: art.tint,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <T v="heading" allowFontScaling={false} style={{ fontSize: 22, lineHeight: 28 }}>
                          {g.emoji}
                        </T>
                      </View>
                      <T v="bodyLg" style={{ flex: 1 }}>
                        {g.text}
                      </T>
                    </View>
                  ))}
                </Stagger>
              </View>
            </Card>
          </View>
        ) : null}

        <View style={{ gap: space.md }}>
          <T v="section" header>
            Ways to meet
          </T>
          <Card tone="raised" padding={space.lg}>
            {ways.map((w, i) => (
              <View key={w.title}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.pill,
                      backgroundColor: c.surfaceTint,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={w.icon} size={20} color={c.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="bodyLg">{w.title}</T>
                    <T v="bodySm" color="textMuted">
                      {w.line}
                    </T>
                  </View>
                </View>
                {i < ways.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </Card>
        </View>
      </View>
    </Screen>
  );
}
