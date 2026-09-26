import type { ReactNode } from "react";
import { Image, View, type ImageSourcePropType } from "react-native";
import { radius, space } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import { T } from "./ui/T";

/**
 * Navy panel: navy, radius 24, a character peeking in from the right,
 * a small caption, a white title, and optional content (text, buttons) underneath.
 * `lead` (e.g. the therapist's photo) sits left of the caption and title instead of a character.
 */
export function NavyPanel({
  caption,
  title,
  face,
  lead,
  children,
}: {
  caption?: string;
  title: string;
  face?: ImageSourcePropType;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{
        backgroundColor: c.brand,
        borderRadius: radius.panel,
        padding: space.xl,
        overflow: "hidden",
        gap: space.md,
      }}
    >
      {face ? (
        <Image
          source={face}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{
            position: "absolute",
            right: -22,
            top: -12,
            width: 116,
            height: 116,
            transform: [{ rotate: "10deg" }],
          }}
        />
      ) : null}
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}
      >
        {lead}
        <View style={{ flex: 1, gap: space.xs, paddingRight: face ? 72 : 0 }}>
          {caption ? (
            <T v="caption" color="onBrand" style={{ opacity: 0.85 }}>
              {caption}
            </T>
          ) : null}
          <T v="title" color="onBrand" header>
            {title}
          </T>
        </View>
      </View>
      {children}
    </View>
  );
}
