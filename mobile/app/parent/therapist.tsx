/**
 * P11 Therapist profile. A navy header with large initials and the therapist's character (no photos), then
 * sections (intro, years with kids, "Good fit for", "Ways to meet") and a sticky "Book a session".
 * No prices, no ratings, no testimonials.
 * ?preview=1: the therapist's own "See it as families do" (from Your profile): the same page without the Book button
 * and without the character (the therapist side keeps illustrations to a minimum).
 */
import { router, useLocalSearchParams, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { goBack } from "@/components/Header";
import { Screen } from "@/components/Screen";
import { Appear, Stagger } from "@/components/ui/Appear";
import { Avatar, Divider } from "@/components/ui/bits";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { T } from "@/components/ui/T";
import { FACES } from "@/data/faces";
import { WAYS_TO_MEET } from "@/data/therapists";
import { useTherapist } from "@/store/app";
import { artTints, gutter, radius, space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

export default function TherapistProfile() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; preview?: string }>();
  const t = useTherapist(params.id ?? "priya");
  const preview = params.preview === "1";
  const inPerson = WAYS_TO_MEET.inPerson(t);

  const ways: { icon: IconName; title: string; line: string }[] = [
    { icon: "video", ...WAYS_TO_MEET.video },
    { icon: "map-pin", ...inPerson },
    { icon: "users", ...WAYS_TO_MEET.parentCheckIn },
    { icon: "file-text", ...WAYS_TO_MEET.notes },
  ];

  return (
    <Screen
      padded={false}
      edgeToEdge
      backdrop="brand"
      footer={
        preview ? undefined : (
          <Button
            title="Book a session"
            icon="arrow-right"
            onPress={() => router.push(`/parent/book?id=${t.id}` as Href)}
          />
        )
      }
    >
      <StatusBar style="light" />
      {/* Header — navy, initials + character (no photos) */}
      <View
        style={{
          backgroundColor: c.brand,
          paddingTop: insets.top,
          overflow: "hidden",
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        {preview ? null : (
          <Image
            source={FACES[t.art.face]}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              position: "absolute",
              right: -40,
              top: insets.top + 10,
              width: 210,
              height: 210,
              opacity: 0.95,
              transform: [{ rotate: "-10deg" }],
            }}
          />
        )}
        <View
          style={{ paddingHorizontal: gutter - space.sm, paddingTop: space.sm }}
        >
          <IconButton
            icon="chevron-left"
            label="Back"
            variant="soft"
            onPress={() =>
              goBack(preview ? "/therapist/account" : "/parent/find-therapist")
            }
          />
        </View>
        <View style={{ padding: gutter, paddingTop: space.xxl, gap: space.md }}>
          <Avatar initials={t.initials} size={88} />
          <View style={{ gap: space.xs }}>
            <T v="title" color="onBrand" header>
              {t.name}
            </T>
            <T v="bodyLg" color="onBrand" style={{ opacity: 0.9 }}>
              {t.role}
            </T>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: gutter, gap: space.xl }}>
        <Appear>
          <Card tone="raised" r={24} padding={space.lg}>
            <View style={{ gap: space.md }}>
              <Badge label={t.years} tone="brand" />
              <T v="bodyLg">{t.tagline}</T>
              <Divider />
              <T v="body" color="textSecondary">
                {t.about}
              </T>
            </View>
          </Card>
        </Appear>

        <View style={{ gap: space.md }}>
          <T v="section" header>
            Good fit for
          </T>
          <Card tone="raised" padding={space.lg}>
            <View style={{ gap: space.md }}>
              <Stagger>
                {t.goodFor.map((g) => (
                  <View
                    key={g.text}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space.md,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: radius.pill,
                        backgroundColor: artTints[t.art.tint],
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <T
                        v="heading"
                        allowFontScaling={false}
                        style={{ fontSize: 22, lineHeight: 28 }}
                      >
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

        <View style={{ gap: space.md }}>
          <T v="section" header>
            Ways to meet
          </T>
          <Card tone="raised" padding={space.lg}>
            {ways.map((w, i) => (
              <View key={w.title}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.md,
                    paddingVertical: space.sm,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.pill,
                      backgroundColor: c.surfaceTint,
                      alignItems: "center",
                      justifyContent: "center",
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
