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

const light: Palette = {
  bg: '#FBF7F1',
  surface: '#FFFFFF',
  surfaceAlt: '#F2EAE0',
  text: '#1B1512',
  textMuted: '#655A52',
  textFaint: '#8B7E74',
  border: '#E8DDD0',
  borderStrong: '#D3C3B0',
  accent: '#BE3A11',
  onAccent: '#FFFFFF',
  accentSoft: '#FBE7DC',
  onAccentSoft: '#8E2A0B',
  gold: '#9A6B08',
  positive: '#2F6B45',
  positiveSoft: '#E1EFE5',
  caution: '#8A5A0B',
  cautionSoft: '#F8ECD6',
  scrim: 'rgba(27, 21, 18, 0.5)',
  overlay: 'rgba(15, 11, 9, 0.55)',
};

const dark: Palette = {
  bg: '#12100E',
  surface: '#1C1917',
  surfaceAlt: '#282320',
  text: '#F6F1EA',
  textMuted: '#B4A79C',
  textFaint: '#8E827A',
  border: '#332C28',
  borderStrong: '#4A403A',
  accent: '#FF8556',
  onAccent: '#2A0F04',
  accentSoft: '#3A2119',
  onAccentSoft: '#FFB694',
  gold: '#E0AC4B',
  positive: '#68C08C',
  positiveSoft: '#1D2E24',
  caution: '#E0B45F',
  cautionSoft: '#2F2618',
  scrim: 'rgba(0, 0, 0, 0.62)',
  overlay: 'rgba(10, 7, 6, 0.6)',
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

export const fonts = {
  display: 'Fraunces_700Bold',
  displayMedium: 'Fraunces_600SemiBold',
  body: 'Karla_400Regular',
  bodyMedium: 'Karla_500Medium',
  bodyBold: 'Karla_700Bold',
} as const;

/**
 * Type scale. `display` sizes carry negative tracking because Fraunces sets
 * loose at large optical sizes; `label` sizes carry positive tracking.
 */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.displayMedium, fontSize: 21, lineHeight: 26, letterSpacing: -0.3 },
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
