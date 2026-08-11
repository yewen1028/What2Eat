import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Suggestion } from '../lib/types';
import { useTheme } from '../theme/theme';
import { fonts, radius, space } from '../theme/tokens';
import { OpenBadge, PriceLevel, Rating } from './Badges';
import { PlaceImage } from './PlaceImage';
import { SaveButton } from './SaveButton';
import { Touchable } from './Touchable';
import { Txt } from './Txt';

interface Props {
  suggestion: Suggestion;
  /** 1-based position. Rendered as an editorial numeral, not a badge. */
  rank?: number;
  showDivider?: boolean;
}

export function PlaceRow({ suggestion, rank, showDivider = true }: Props) {
  const { c } = useTheme();
  const router = useRouter();
  const { place } = suggestion;

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${rank ? `Number ${rank}. ` : ''}${place.name}, ${place.cuisine}, rated ${place.rating.toFixed(1)}, ${suggestion.walkMinutes} minute walk`}
      accessibilityHint="Opens the full listing"
      onPress={() => router.push(`/place/${place.id}`)}
      scaleTo={0.99}
      style={[
        styles.row,
        showDivider && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
      ]}
    >
      <View>
        <PlaceImage uri={place.photo} seed={place.name} style={styles.thumb} />
        {rank !== undefined ? (
          <View style={[styles.rank, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 13, color: c.textMuted }}>{rank}</Txt>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {/* Two lines: Malaysian names run long and the name is the one thing
            the user is actually scanning for. */}
        <Txt variant="heading" numberOfLines={2}>
          {place.name}
        </Txt>

        <Txt variant="small" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
          {place.cuisine}
        </Txt>

        <View style={styles.metaRow}>
          <Rating rating={place.rating} reviewCount={place.reviewCount} compact />
          <View style={{ width: space.md }} />
          <PriceLevel level={place.priceLevel} priceText={place.priceText} />
        </View>

        <View style={[styles.metaRow, { marginTop: 6 }]}>
          <OpenBadge suggestion={suggestion} />
          <Txt variant="small" tone="faint" style={{ marginHorizontal: 6 }}>
            ·
          </Txt>
          <Txt variant="small" tone="muted" numberOfLines={1}>
            {suggestion.walkMinutes} min walk
          </Txt>
        </View>
      </View>

      <SaveButton place={place} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    // Top-aligned: with two-line names the row is tall enough that a centred
    // thumbnail floats away from the name it belongs to.
    alignItems: 'flex-start',
    paddingVertical: space.lg,
  },
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  rank: {
    position: 'absolute',
    top: -6,
    left: -6,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, marginLeft: space.lg, marginRight: space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
});
