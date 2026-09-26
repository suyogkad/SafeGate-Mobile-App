import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Image, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ART } from "../data/faces";
import { gutter, palette, size, space } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

/**
 * Full-bleed hero band from the top edge (under the status bar), two variants:
 *  - `home`    navy band, the crown character anchored top-right, white text (child Home, parent Home).
 *  - `explore` amber band, the moustache character + its raised finger, black text (Explore, Find a therapist).
 * Art at 375 × 334 (shifted right a little for longer copy); a text column + small pill button bottom-left
 * (16 gap). Still and decorative: nothing fills, counts or moves.
 * The text column stays clear of the character so text never sits on the art.
 *  - `photo` (therapist Today): the therapist's own photo, full bleed, under a navy overlay that is strongest behind
 *    the text (bottom-left) and at the top (the bell), so white text stays readable on any photo.
 */
export function HeroBand({
  children,
  topRight,
  topLeft,
  art = "home",
  photo,
}: {
  children: ReactNode;
  topRight?: ReactNode;
  /** e.g. a back button when the hero tops a pushed screen */
  topLeft?: ReactNode;
  art?: "home" | "explore";
  /** a photo instead of the character art */
  photo?: ImageSourcePropType;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const height = size.hero + insets.top;
  const explore = art === "explore";
  const artTop = insets.top - 34;
  return (
    <View
      style={{
        backgroundColor: explore ? palette.amber300 : c.brand,
        minHeight: height,
        overflow: "hidden",
      }}
    >
      {photo ? (
        <>
          <Image
            source={photo}
            resizeMode="cover"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
            }}
          />
          {/* navy from the bottom (behind the text) and a lighter band at the top (behind the bell) */}
          <LinearGradient
            colors={[
              "rgba(24,35,79,0.55)",
              "rgba(24,35,79,0.05)",
              "rgba(24,35,79,0.55)",
              "rgba(24,35,79,0.92)",
            ]}
            locations={[0, 0.3, 0.6, 1]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["rgba(24,35,79,0.6)", "rgba(24,35,79,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.75, y: 0 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            pointerEvents="none"
          />
        </>
      ) : explore ? (
        <>
          <Image
            source={ART.exploreFace}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              position: "absolute",
              right: -40,
              top: artTop,
              width: 278,
              height: 334,
            }}
          />
          <Image
            source={ART.exploreHand}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              position: "absolute",
              right: 100,
              top: artTop + 180,
              width: 81,
              height: 154,
            }}
          />
        </>
      ) : (
        <Image
          source={ART.heroHome}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{
            position: "absolute",
            right: -84,
            top: insets.top - 30,
            width: 375,
            height: 334,
          }}
        />
      )}
      {topLeft ? (
        <View
          style={{
            position: "absolute",
            top: insets.top + space.sm,
            left: gutter - space.sm,
            zIndex: 1,
          }}
        >
          {topLeft}
        </View>
      ) : null}
      {topRight ? (
        <View
          style={{
            position: "absolute",
            top: insets.top + space.md,
            right: gutter,
            zIndex: 1,
          }}
        >
          {topRight}
        </View>
      ) : null}
      <View
        style={{
          minHeight: height,
          paddingTop: insets.top + 72,
          paddingBottom: space.xl,
          paddingLeft: gutter,
          width: photo ? "100%" : (explore ? 160 : 180) + gutter,
          paddingRight: photo ? gutter : 0,
          justifyContent: "flex-end",
          gap: space.lg,
        }}
      >
        {children}
      </View>
    </View>
  );
}
