import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { formatCount } from '../lib/score';
import { formatDuration, formatMinutesOfDay } from '../lib/time';
import { Suggestion } from '../lib/types';
import { useTheme } from '../theme/theme';
import { icon, radius, space } from '../theme/tokens';
import { Txt } from './Txt';

interface RatingProps {
  rating: number;
  reviewCount?: number;
  /** Renders light-on-dark, for use over a photo. */
  onPhoto?: boolean;
  compact?: boolean;
}

export function Rating({ rating, reviewCount, onPhoto, compact }: RatingProps) {
  const { c } = useTheme();
  const textColor = onPhoto ? '#FFFFFF' : c.text;
  const mutedColor = onPhoto ? 'rgba(255,255,255,0.78)' : c.textMuted;

  return (
    <View
      style={styles.row}
      accessibilityLabel={
        reviewCount
          ? `Rated ${rating.toFixed(1)} out of 5 from ${reviewCount} reviews`
          : `Rated ${rating.toFixed(1)} out of 5`
      }
    >
      <Ionicons name="star" size={compact ? icon.sm - 2 : icon.sm} color={onPhoto ? '#F5C26B' : c.gold} />
      <Txt variant={compact ? 'smallStrong' : 'bodyStrong'} color={textColor} style={{ marginLeft: 5 }}>
        {rating.toFixed(1)}
      </Txt>
      {reviewCount !== undefined && reviewCount > 0 ? (
        <Txt variant="small" color={mutedColor} style={{ marginLeft: 5 }}>
          ({formatCount(reviewCount)})
        </Txt>
      ) : null}
    </View>
  );
}

export function PriceLevel({
  level,
  priceText,
  onPhoto,
}: {
  level: number;
  /** Real range from the provider, e.g. "RM 15–30". Preferred when present. */
  priceText?: string;
  onPhoto?: boolean;
}) {
  const { c } = useTheme();
  const active = onPhoto ? '#FFFFFF' : c.text;
  const inactive = onPhoto ? 'rgba(255,255,255,0.4)' : c.textFaint;

  // An actual price beats an abstraction of one.
  if (priceText) {
    return (
      <Txt variant="smallStrong" color={active} accessibilityLabel={`Typical spend ${priceText}`}>
        {priceText}
      </Txt>
    );
  }

  return (
    <View style={styles.row} accessibilityLabel={`Price level ${level} of 4`}>
      {[1, 2, 3, 4].map((n) => (
        <Txt key={n} variant="smallStrong" color={n <= level ? active : inactive}>
          $
        </Txt>
      ))}
    </View>
  );
}

/** Only the opening state — callers should not need a full ranked Suggestion. */
export type OpenBadgeState = Pick<
  Suggestion,
  'isOpen' | 'closingInMinutes' | 'opensInMinutes'
>;

/**
 * Open state uses shape *and* wording, never colour alone: the dot is filled
 * when open and hollow when closed, and the label always spells it out.
 */
export function OpenBadge({ suggestion, onPhoto }: { suggestion: OpenBadgeState; onPhoto?: boolean }) {
  const { c } = useTheme();
  const { isOpen, closingInMinutes, opensInMinutes } = suggestion;

  const closingSoon = isOpen && closingInMinutes !== null && closingInMinutes <= 45;
  const tint = closingSoon ? c.caution : isOpen ? c.positive : c.textFaint;
  const color = onPhoto ? (closingSoon ? '#F0C070' : isOpen ? '#8FD6AC' : 'rgba(255,255,255,0.7)') : tint;

  let label: string;
  if (isOpen && closingSoon) label = `Closes in ${formatDuration(closingInMinutes!)}`;
  else if (isOpen) label = 'Open now';
  else if (opensInMinutes !== null && opensInMinutes <= 180)
    label = `Opens in ${formatDuration(opensInMinutes)}`;
  else label = 'Closed';

  return (
    <View style={styles.row} accessibilityLabel={label}>
      <View
        style={[
          styles.dot,
          isOpen
            ? { backgroundColor: color }
            : { borderWidth: 1.5, borderColor: color, backgroundColor: 'transparent' },
        ]}
      />
      <Txt variant="smallStrong" color={color} style={{ marginLeft: 6 }}>
        {label}
      </Txt>
    </View>
  );
}

interface ChipProps {
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  tone?: 'neutral' | 'accent';
  style?: StyleProp<ViewStyle>;
}

/** Read-only metadata pill. For interactive filters see `FilterChip`. */
export function Chip({ label, iconName, tone = 'neutral', style }: ChipProps) {
  const { c } = useTheme();
  const bg = tone === 'accent' ? c.accentSoft : c.surfaceAlt;
  const fg = tone === 'accent' ? c.onAccentSoft : c.textMuted;

  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      {iconName ? (
        <Ionicons name={iconName} size={icon.sm - 3} color={fg} style={{ marginRight: 5 }} />
      ) : null}
      <Txt variant="smallStrong" color={fg}>
        {label}
      </Txt>
    </View>
  );
}

export function ClosingTimeNote({ suggestion }: { suggestion: OpenBadgeState }) {
  const { isOpen, closingInMinutes } = suggestion;
  if (!isOpen || closingInMinutes === null) return null;
  const closesAt = new Date();
  closesAt.setMinutes(closesAt.getMinutes() + closingInMinutes);
  return (
    <Txt variant="small" tone="muted">
      Serving until {formatMinutesOfDay(closesAt.getHours() * 60 + closesAt.getMinutes())}
    </Txt>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md - 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
});
