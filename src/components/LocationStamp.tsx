import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { formatFixAge, isFixStale } from '../lib/time';
import { useNearby } from '../state/nearby';
import { useTheme } from '../theme/theme';
import { icon, radius, space } from '../theme/tokens';
import { Touchable } from './Touchable';
import { Txt } from './Txt';

/**
 * Where the ranking is measured from, and how old that reading is.
 *
 * Every distance and walk time in the app comes off one position fix, and the
 * app used to present those as though they were live. Naming the place and
 * stamping the fix lets the user see when the numbers have drifted, and tapping
 * re-reads the GPS and re-ranks rather than making them hunt for pull-to-refresh.
 *
 * Staleness is never signalled by colour alone: the wording changes, the icon
 * switches to a hollow variant, and the refresh glyph appears.
 */
export function LocationStamp() {
  const { c } = useTheme();
  const { fixedAt, areaName, usingDemoLocation, status, now, refresh, refreshing } = useNearby();

  if (status !== 'ready') return null;

  const stale = isFixStale(fixedAt, now);
  const place = usingDemoLocation ? 'Demo location' : (areaName ?? 'Your location');
  const age = fixedAt ? formatFixAge(fixedAt, now) : null;

  const detail = usingDemoLocation
    ? 'not where you are'
    : refreshing
      ? 'updating'
      : age
        ? `fix ${age}`
        : null;

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`Measured from ${place}${detail ? `, ${detail}` : ''}`}
      accessibilityHint="Re-reads your location and re-ranks the list"
      accessibilityState={{ busy: refreshing }}
      haptic="selection"
      onPress={() => void refresh()}
      style={[
        styles.pill,
        { backgroundColor: c.surfaceAlt, borderColor: stale ? c.borderStrong : 'transparent' },
      ]}
    >
      <Ionicons
        name={usingDemoLocation || stale ? 'location-outline' : 'location'}
        size={icon.sm}
        color={usingDemoLocation || stale ? c.textMuted : c.accent}
      />
      <Txt variant="label" tone="muted" numberOfLines={1} style={styles.label}>
        {place}
        {detail ? ` · ${detail}` : ''}
      </Txt>
      {refreshing ? (
        <ActivityIndicator size="small" color={c.textFaint} style={styles.glyph} />
      ) : stale || usingDemoLocation ? (
        <Ionicons name="refresh" size={icon.sm - 2} color={c.textFaint} style={styles.glyph} />
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingLeft: space.sm,
    paddingRight: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { marginLeft: 5, flexShrink: 1 },
  glyph: { marginLeft: space.sm },
});
