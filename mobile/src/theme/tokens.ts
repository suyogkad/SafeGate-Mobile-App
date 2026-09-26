/**
 * SafeGate design tokens (HANDOFF.md §6).
 * Screens never use raw hex: import from here.
 */

export const palette = {
  blue50: '#DAE1FB',
  blue100: '#C2CDF9',
  blue300: '#6781EF',
  blue500: '#4868EC',
  blue700: '#30459D',
  blue800: '#243476',
  blue900: '#18234F',
  white: '#FFFFFF',
  grey50: '#F7F9FA',
  grey100: '#F2F4F5',
  grey200: '#E3E5E5',
  grey500: '#72777A',
  grey600: '#6A6F72',
  grey700: '#404446',
  black: '#090A0A',
  amber500: '#FFA300',
  amber50: '#FFEFD7',
  amber800: '#8A5A00',
  /** Explore hero band */
  amber300: '#FFC462',
  green50: '#ECFCE5',
  green700: '#198155',
  warn700: '#A05E03',
} as const;

export const colors = {
  bg: palette.white,
  surface: palette.grey50,
  surfaceTint: palette.blue50,
  primary: palette.blue500,
  onPrimary: palette.white,
  brand: palette.blue700,
  onBrand: palette.white,
  brandSoft: palette.blue100,
  text: palette.black,
  textSecondary: palette.grey700,
  /** Darkened from grey600 so muted text stays ≥ 4.5:1 on the tinted page backgrounds too, not only on white. */
  textMuted: '#5E6366',
  border: palette.grey100,
  divider: palette.grey100,
  /** Edge of anything you type into (fields, code boxes, writing boxes): 3.1:1 on white, the WCAG minimum for a control's boundary. */
  fieldBorder: '#8E949A',
  /** Hairline edge for white cards so they never float on the pale backgrounds. */
  cardBorder: '#DCE2F3',
  /** Edge of unselected chips and segmented tracks: visible on the pale backgrounds without looking heavy. */
  chipBorder: '#B6BED3',
  track: palette.grey200,
  chip: palette.grey100,
  disabledBg: palette.grey100,
  disabledText: palette.grey600,
  focus: palette.blue500,
  scrim: 'rgba(9,10,10,0.4)',
  help: palette.amber500,
  onHelp: palette.black,
  helpTint: palette.amber50,
  onHelpTint: palette.amber800,
  successTint: palette.green50,
  onSuccessTint: palette.green700,
  warnTint: palette.amber50,
  onWarnTint: palette.warn700,
} as const;

/** "Stronger colours" comfort setting: deeper brand, stronger borders. */
export const strongColors: Partial<Record<keyof typeof colors, string>> = {
  brand: palette.blue900,
  primary: palette.blue700,
  textMuted: palette.grey700,
  border: palette.grey500,
  divider: palette.grey200,
  fieldBorder: palette.grey700,
  cardBorder: palette.grey200,
  chipBorder: palette.grey500,
  chip: palette.grey200,
};

export type ColorName = keyof typeof colors;

/** Tinted circles behind characters (check-in cards). No red/pink in the child app. */
export const artTints = {
  cyan: '#BFEAEC',
  lavender: '#E9E5FF',
  blue: palette.blue50,
  yellow: '#FFF8CC',
  green: palette.green50,
  amber: palette.amber50,
} as const;

export const moodColors = {
  bad: { tint: '#E9E5FF', word: '#5B4BC4' },
  notGreat: { tint: '#BFEAEC', word: '#00666B' },
  ok: { tint: palette.blue50, word: palette.blue700 },
  good: { tint: palette.green50, word: palette.green700 },
  great: { tint: '#FFF8CC', word: '#7A5C00' },
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  bold: 'PlusJakartaSans_700Bold',
} as const;

type TypeStyle = { fontFamily: string; fontSize: number; lineHeight: number };

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  section: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24 },
  navTitle: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 24 },
  bodyLg: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 20 },
  bodySm: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bodySmMedium: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  mood: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 24 },
  moodLg: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32 },
} satisfies Record<string, TypeStyle>;

export type TypeName = keyof typeof type;

/** Child app floor. Captions are 12; "Biggest" lifts them to 14. */
export const CHILD_MIN_FONT = 12;

/** The child's default is "Bigger", which is the design's own sizes. Normal is a touch smaller, Biggest larger. */
export const textScale = { Normal: 0.94, Bigger: 1, Biggest: 1.18 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const gutter = 24;

export const radius = { field: 8, tile: 12, card: 16, panel: 24, pill: 999 } as const;

export const size = {
  navBar: 48,
  button: 48,
  buttonSmall: 36,
  field: 48,
  chip: 40,
  badge: 24,
  touch: 56,
  iconButton: 48,
  tabBar: 56,
  hero: 300,
  faceCircle: 101,
} as const;

/** The one soft shadow in the design (sticky bottom bar). */
export const shadow = {
  bar: { boxShadow: '0px 0px 8px rgba(20,20,20,0.08), 0px 0px 1px rgba(20,20,20,0.04)' },
  // A 1 px ring (the card's edge) + a soft blue-tinted drop, so white cards stay distinct on the pale backgrounds.
  lift: { boxShadow: '0px 0px 0px 1px #DCE2F3, 0px 2px 8px rgba(48,69,157,0.10)' },
  /** the raised centre tab button */
  raised: { boxShadow: '0px 4px 12px rgba(72,104,236,0.35)' },
} as const;

export const motion = { childFade: 150, parentFade: 250, failSafe: 600 } as const;

/**
 * Page backgrounds (HANDOFF.md §6.6): a top-to-bottom wash + three soft glows, all from the brand palette.
 * soft = default (blue wash, lavender/blue/amber glows) · brand = parent setup & sign-in (a little richer)
 * help = Get help (amber help tint) · calm = calm mode (barely there).
 */
type Glow = { color: string; opacity: number };
export const backdrops: Record<'soft' | 'brand' | 'help' | 'calm', { wash: [string, string, ...string[]]; glows: [Glow, Glow, Glow] }> = {
  soft: {
    // Never fades to pure white: white cards and fields need a tint behind them to stand out.
    wash: ['#E6ECFC', '#F0F3FE', '#F4F5FC'],
    glows: [
      { color: palette.blue100, opacity: 0.6 },
      { color: '#E9E5FF', opacity: 0.8 },
      { color: palette.amber50, opacity: 0.85 },
    ],
  },
  brand: {
    wash: [palette.blue50, '#F1F3FE', palette.white],
    glows: [
      // blue100, not blue300: the stronger glow sat behind header text and pulled it under 4.5:1.
      { color: palette.blue100, opacity: 0.7 },
      { color: '#CBC5ED', opacity: 0.6 },
      { color: '#BFEAEC', opacity: 0.6 },
    ],
  },
  help: {
    wash: [palette.amber50, '#FFF8EE', palette.white],
    glows: [
      { color: '#FFD9A0', opacity: 0.55 },
      { color: '#FFF8CC', opacity: 0.8 },
      { color: palette.blue50, opacity: 0.6 },
    ],
  },
  calm: {
    wash: ['#EEF1FC', '#F4F6FD'],
    glows: [
      { color: palette.blue50, opacity: 0.6 },
      { color: '#E9E5FF', opacity: 0.45 },
      { color: '#BFEAEC', opacity: 0.35 },
    ],
  },
};
export type BackdropName = keyof typeof backdrops;
