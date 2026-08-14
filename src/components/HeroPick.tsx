import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { formatDistance } from '../lib/geo';
import { headlineReason, ratingLabel } from '../lib/score';
import { Suggestion } from '../lib/types';
import { useTheme } from '../theme/theme';
import { icon, motion, radius, space } from '../theme/tokens';
import { hasPriceInfo, OpenBadge, PriceLevel, Rating } from './Badges';
import { PlaceImage } from './PlaceImage';
import { SaveButton } from './SaveButton';
import { Touchable } from './Touchable';
import { Txt } from './Txt';

const CARD_HEIGHT = 420;
/** Extra image height that the parallax translate eats into. */
const PARALLAX_OVERSCAN = 56;

interface Props {
  suggestion: Suggestion;
  /** Vertical scroll offset of the parent list, for the parallax. */
  scrollY: SharedValue<number>;
  /** Bumped on shuffle so the card re-animates. */
  generation: number;
}

/**
 * The answer to the question. One place, photographed large, with the two or
 * three facts that justify walking there — and nothing else competing for
 * attention.
 */
export function HeroPick({ suggestion, scrollY, generation }: Props) {
  const { c } = useTheme();
  const router = useRouter();
  const { place } = suggestion;

  const parallax = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, 400], [-40, 0, PARALLAX_OVERSCAN]) },
    ],
  }));

  return (
    <Animated.View
      key={generation}
      entering={FadeIn.duration(motion.slow).easing(Easing.bezier(...motion.ease).factory())}
    >
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={`${place.name}, ${place.cuisine}, ${ratingLabel(place.rating)}, ${suggestion.walkMinutes} minute walk`}
        accessibilityHint="Opens the full listing"
        haptic="medium"
        onPress={() => router.push(`/place/${place.id}`)}
        scaleTo={0.985}
        style={[styles.card, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
      >
        <Animated.View style={[styles.imageWrap, parallax]}>
          <PlaceImage
            uri={place.photo}
            seed={place.name}
            style={styles.image}
            accessibilityLabel={`Photo of ${place.name}`}
          />
        </Animated.View>

        {/* The scrim is pinned to the card, not to the image, so it keeps its
            grip on the text while the photo drifts underneath. */}
        <LinearGradient
          colors={['rgba(12, 8, 6, 0.45)', 'transparent', 'rgba(12, 8, 6, 0.55)', 'rgba(12, 8, 6, 0.92)']}
          locations={[0, 0.28, 0.68, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.topRow} pointerEvents="box-none">
          <View style={styles.pickBadge}>
            <Ionicons name="sparkles" size={icon.sm - 2} color="#FFFFFF" />
            <Txt variant="labelBold" color="#FFFFFF" uppercase style={{ marginLeft: 6 }}>
              Top pick
            </Txt>
          </View>
          <SaveButton place={place} onPhoto />
        </View>

        <View style={styles.body} pointerEvents="none">
          <Txt variant="label" color="rgba(255,255,255,0.82)" uppercase numberOfLines={1}>
            {place.cuisine}
          </Txt>

          <Txt variant="hero" color="#FFFFFF" numberOfLines={2} style={styles.name}>
            {place.name}
          </Txt>

          <View style={styles.metaRow}>
            <Rating rating={place.rating} reviewCount={place.reviewCount} onPhoto />
            <Dot />
            <Txt variant="smallStrong" color="rgba(255,255,255,0.86)">
              {suggestion.walkMinutes} min walk
            </Txt>
            {hasPriceInfo(place) ? (
              <>
                <Dot />
                <PriceLevel level={place.priceLevel} priceText={place.priceText} onPhoto />
              </>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <OpenBadge suggestion={suggestion} onPhoto />
            <Dot />
            <Txt variant="small" color="rgba(255,255,255,0.72)" numberOfLines={1} style={{ flex: 1 }}>
              {formatDistance(suggestion.distance)} · {headlineReason(suggestion)}
            </Txt>
          </View>
        </View>
      </Touchable>
    </Animated.View>
  );
}

function Dot() {
  return (
    <Txt variant="small" color="rgba(255,255,255,0.45)" style={{ marginHorizontal: space.sm }}>
      ·
    </Txt>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-end',
  },
  imageWrap: {
    ...StyleSheet.absoluteFillObject,
    top: -PARALLAX_OVERSCAN,
    height: CARD_HEIGHT + PARALLAX_OVERSCAN * 2,
  },
  image: { flex: 1 },
  topRow: {
    position: 'absolute',
    top: space.md,
    left: space.lg,
    right: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 14, 11, 0.5)',
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  body: { padding: space.xl },
  name: { marginTop: space.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.md },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
});
