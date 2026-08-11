/**
 * What2Eat design tokens.
 *
 * Direction: warm editorial. Paper-coloured surfaces, an ember accent borrowed
 * from a charred crust, a high-contrast serif for the voice and a quiet
 * grotesque for everything functional. No gradients-as-decoration, no glass,
 * no drop shadows doing work that a hairline border can do.
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** Page background — the "paper". */
  bg: string;
  /** Raised content: cards, sheets. */
  surface: string;
  /** Recessed fills: chips, skeletons, image placeholders. */
  surfaceAlt: string;
  /** Primary text. >= 4.5:1 on bg and surface. */
  text: string;
  /** Secondary text. >= 4.5:1 on bg (we do not settle for 3:1 on body copy). */
  textMuted: string;
  /** Tertiary text: timestamps, units. >= 3:1. */
  textFaint: string;
  /** Hairline dividers and card outlines. Visible in both schemes. */
  border: string;
  /** Stronger outline for focus / selected states. */
  borderStrong: string;
  /** Brand accent — ember. */
  accent: string;
  /** Text/icon colour placed on `accent`. */
  onAccent: string;
  /** Tinted accent wash for selected chips and badges. */
  accentSoft: string;
  /** Text placed on `accentSoft`. */
  onAccentSoft: string;
  /** Rating gold. */
  gold: string;
  /** "Open now" positive signal. */
  positive: string;
  positiveSoft: string;
  /** "Closing soon" caution signal. */
  caution: string;
  cautionSoft: string;
  /** Modal / sheet scrim. */
  scrim: string;
  /** Ink used inside photo overlays, both schemes. */
  overlay: string;
}

/**
 * Palette: slate + terracotta.
 *
 * Deliberately NOT the warm-cream + brass + espresso family that every
 * AI-generated "premium food" interface reaches for. Surfaces are a cool
 * neutral bone, text is a true ink rather than warm espresso, and the single
 * accent is a terracotta that stays appetising without pairing into that
 * template. The cool ground also makes the food photography read hotter, which
 * is the whole job of the chrome in this app.
 */
const light: Palette = {
  bg: '#EDEEEC',
  surface: '#FFFFFF',
  surfaceAlt: '#E1E3E0',
  text: '#15181A',
  textMuted: '#545A5D',
  textFaint: '#7C8285',
  border: '#D6D9D5',
  borderStrong: '#B8BCB8',
  accent: '#C0472A',
  onAccent: '#FFFFFF',
  accentSoft: '#F7E4DE',
  onAccentSoft: '#8C2F17',
  gold: '#8A6A0B',
  positive: '#1F6B4A',
  positiveSoft: '#DFEDE6',
  caution: '#8A5A0B',
  cautionSoft: '#F5EAD6',
  scrim: 'rgba(21, 24, 26, 0.5)',
  overlay: 'rgba(12, 14, 15, 0.55)',
};

const dark: Palette = {
  bg: '#101214',
  surface: '#1A1D1F',
  surfaceAlt: '#24282A',
  text: '#ECEEED',
  textMuted: '#A3A9AC',
  textFaint: '#7A8184',
  border: '#2C3033',
  borderStrong: '#444A4D',
  accent: '#FF7A52',
  onAccent: '#2A0C02',
  accentSoft: '#3A1F18',
  onAccentSoft: '#FFB197',
  gold: '#DDB25E',
  positive: '#5CC08B',
  positiveSoft: '#182C23',
  caution: '#DDB05E',
  cautionSoft: '#2C2517',
  scrim: 'rgba(0, 0, 0, 0.62)',
  overlay: 'rgba(6, 8, 9, 0.6)',
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** 4/8pt rhythm. Use these, never raw numbers, for padding and gaps. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Icon sizes as tokens so strokes and rhythm stay consistent. */
export const icon = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

/**
 * Bricolage Grotesque for display, Karla for everything functional.
 *
 * The display face is a sans with real character (odd, slightly condensed
 * proportions) rather than the editorial serif that food apps default to.
 * Malaysian street food is not a French bistro, and a serif was borrowing the
 * wrong reference.
 */
export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayMedium: 'BricolageGrotesque_600SemiBold',
  body: 'Karla_400Regular',
  bodyMedium: 'Karla_500Medium',
  bodyBold: 'Karla_700Bold',
} as const;

/**
 * Type scale. `display` sizes carry negative tracking because Fraunces sets
 * loose at large optical sizes; `label` sizes carry positive tracking.
 */
export const type = {
  // Bricolage sets wider than a serif at display sizes, so tracking pulls in
  // harder than the previous scale did.
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.6 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -1 },
  heading: { fontFamily: fonts.displayMedium, fontSize: 21, lineHeight: 26, letterSpacing: -0.6 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  smallStrong: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  labelBold: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 },
} as const;

/** Motion. Everything lands between 150–320ms; nothing bounces for fun. */
export const motion = {
  fast: 160,
  base: 220,
  slow: 320,
  /** Standard ease-out curve, expressed for Reanimated's Easing.bezier. */
  ease: [0.22, 0.61, 0.36, 1] as const,
  pressScale: 0.975,
} as const;

/** Minimum tappable area, per platform accessibility guidance. */
export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
export const MIN_TAP = 44;
