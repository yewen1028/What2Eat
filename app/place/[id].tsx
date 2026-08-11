import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, OpenBadge, PriceLevel, Rating } from '../../src/components/Badges';
import { Button } from '../../src/components/Button';
import {
  EmptyState,
  SampleDataBadge,
  SCREEN_PADDING,
  SectionHeader,
} from '../../src/components/Layout';
import { PlaceImage } from '../../src/components/PlaceImage';
import { SaveButton } from '../../src/components/SaveButton';
import { ScoreBreakdown } from '../../src/components/ScoreBreakdown';
import { Touchable } from '../../src/components/Touchable';
import { Txt } from '../../src/components/Txt';
import { formatDistance } from '../../src/lib/geo';
import { openDirections } from '../../src/lib/maps';
import { bayesianRating, formatCount } from '../../src/lib/score';
import { formatIntervals, WEEKDAY_LABELS } from '../../src/lib/time';
import { useNearby, usePlace } from '../../src/state/nearby';
import { useTheme } from '../../src/theme/theme';
import { icon, MIN_TAP, radius, space } from '../../src/theme/tokens';

const HERO_HEIGHT = 340;

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { now, isLiveData } = useNearby();
  const suggestion = usePlace(id);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  /** Image drifts at half speed and scales up on over-pull. */
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-HERO_HEIGHT, 0, HERO_HEIGHT],
          [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.5],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(scrollY.value, [-HERO_HEIGHT, 0], [1.6, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  /** The compact title bar only appears once the big one has scrolled away. */
  const titleBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HERO_HEIGHT - 160, HERO_HEIGHT - 90], [0, 1], Extrapolation.CLAMP),
  }));

  if (!suggestion) {
    return (
      <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top + space.xl }]}>
        <BackButton />
        <EmptyState
          iconName="help-circle-outline"
          title="Place not found"
          body="This listing is no longer in the current results. Head back and pick again."
          action={<Button label="Back" onPress={() => router.back()} />}
        />
      </View>
    );
  }

  const { place } = suggestion;
  const today = now.getDay();
  const adjusted = bayesianRating(place.rating, place.reviewCount);

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <Animated.View style={[styles.hero, heroStyle]}>
        <PlaceImage
          uri={place.photo}
          seed={place.name}
          scrim
          style={StyleSheet.absoluteFill as never}
          accessibilityLabel={`Photo of ${place.name}`}
        />
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: space['4xl'] + insets.bottom + 64 }}
      >
        <View style={{ height: HERO_HEIGHT - space['2xl'] }} pointerEvents="none" />

        <View style={[styles.sheet, { backgroundColor: c.bg }]}>
          <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />

          <View style={styles.eyebrow}>
            <Txt variant="label" tone="faint" uppercase style={{ flexShrink: 1 }}>
              {place.cuisine}
            </Txt>
            {!isLiveData ? <SampleDataBadge compact /> : null}
          </View>
          <Txt variant="title" style={{ marginTop: space.xs }} accessibilityRole="header">
            {place.name}
          </Txt>

          <View style={styles.metaRow}>
            <Rating rating={place.rating} reviewCount={place.reviewCount} />
            <Txt variant="small" tone="faint" style={styles.sep}>
              ·
            </Txt>
            <PriceLevel level={place.priceLevel} />
          </View>

          <View style={[styles.metaRow, { marginTop: space.sm }]}>
            <OpenBadge suggestion={suggestion} />
            <Txt variant="small" tone="faint" style={styles.sep}>
              ·
            </Txt>
            <Txt variant="smallStrong" tone="muted">
              {formatDistance(suggestion.distance)} · {suggestion.walkMinutes} min walk
            </Txt>
          </View>

          <Txt variant="body" tone="muted" style={{ marginTop: space.md }}>
            {place.address}
          </Txt>

          {suggestion.reasons.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Why this one" />
              <View style={styles.chipWrap}>
                {suggestion.reasons.map((reason, i) => (
                  <Chip key={reason} label={reason} tone={i === 0 ? 'accent' : 'neutral'} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title="How this ranked" />
            <ScoreBreakdown suggestion={suggestion} />
          </View>

          {place.tags.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Good to know" />
              <View style={styles.chipWrap}>
                {place.tags.map((tag) => (
                  <Chip key={tag} label={tag} />
                ))}
                {place.vegetarianFriendly ? (
                  <Chip label="Vegetarian friendly" iconName="leaf-outline" />
                ) : null}
                {place.typicalWait !== undefined ? (
                  <Chip
                    label={place.typicalWait === 0 ? 'Booking only' : `~${place.typicalWait} min wait`}
                    iconName="hourglass-outline"
                  />
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title="Opening hours" />
            {WEEKDAY_LABELS.map((label, day) => {
              const isToday = day === today;
              return (
                <View
                  key={label}
                  style={[
                    styles.hoursRow,
                    { borderColor: c.border },
                    isToday && { backgroundColor: c.surfaceAlt },
                  ]}
                  accessibilityLabel={`${label}: ${formatIntervals(place.hours[day] ?? [])}${isToday ? ', today' : ''}`}
                >
                  <Txt
                    variant={isToday ? 'bodyStrong' : 'body'}
                    tone={isToday ? 'default' : 'muted'}
                    style={{ width: 56 }}
                  >
                    {label}
                  </Txt>
                  <Txt
                    variant={isToday ? 'bodyStrong' : 'body'}
                    tone={isToday ? 'default' : 'muted'}
                    style={{ flex: 1 }}
                  >
                    {formatIntervals(place.hours[day] ?? [])}
                  </Txt>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Floating controls, above the scroll view */}
      <View
        style={[styles.topBar, { paddingTop: insets.top + space.sm }]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: c.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
            titleBarStyle,
          ]}
          pointerEvents="none"
        />
        <BackButton onPhoto />
        <Animated.View style={[styles.topTitle, titleBarStyle]} pointerEvents="none">
          <Txt variant="bodyStrong" numberOfLines={1}>
            {place.name}
          </Txt>
        </Animated.View>
        <SaveButton place={place} onPhoto />
      </View>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: c.bg,
            borderColor: c.border,
            paddingBottom: Math.max(insets.bottom, space.lg),
          },
        ]}
      >
        <Button
          label="Walking directions"
          iconName="navigate"
          onPress={() => openDirections(place)}
          accessibilityHint={`Opens directions to ${place.name} in your maps app`}
          fullWidth
        />
      </View>
    </View>
  );
}

function BackButton({ onPhoto }: { onPhoto?: boolean }) {
  const { c } = useTheme();
  const router = useRouter();

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={() => router.back()}
      style={styles.iconTap}
    >
      <View
        style={[
          styles.disc,
          onPhoto ? { backgroundColor: 'rgba(20, 14, 11, 0.42)' } : { backgroundColor: c.surfaceAlt },
        ]}
      >
        <Ionicons name="chevron-back" size={icon.md} color={onPhoto ? '#FFFFFF' : c.text} />
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: space.md,
    minHeight: 600,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: space.xl,
  },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.md },
  sep: { marginHorizontal: space.sm },
  section: { marginTop: space['2xl'] },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    marginHorizontal: -space.md,
    borderRadius: radius.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  topTitle: { flex: 1, alignItems: 'center', paddingHorizontal: space.sm },
  iconTap: {
    width: MIN_TAP,
    height: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
