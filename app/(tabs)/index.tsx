import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Badges';
import { HeroPick } from '../../src/components/HeroPick';
import { NoMatches } from '../../src/components/NoMatches';
import {
  EmptyState,
  Notice,
  SampleDataBadge,
  SCREEN_PADDING,
  SectionHeader,
} from '../../src/components/Layout';
import { LocationStamp } from '../../src/components/LocationStamp';
import { Logo } from '../../src/components/Logo';
import { PlaceRow } from '../../src/components/PlaceRow';
import { HeroSkeleton, RowSkeleton } from '../../src/components/Skeleton';
import { Touchable } from '../../src/components/Touchable';
import { Txt } from '../../src/components/Txt';
import { formatClock } from '../../src/lib/time';
import { useDirections, useNearby } from '../../src/state/nearby';
import { useProfile } from '../../src/state/profile';
import { useTheme } from '../../src/theme/theme';
import { icon, MIN_TAP, radius, space } from '../../src/theme/tokens';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function NowScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const { profile } = useProfile();
  const firstName = profile.name.trim().split(/\s+/)[0];

  const {
    status,
    usingDemoLocation,
    isLiveData,
    source,
    warning,
    loading,
    refreshing,
    error,
    now,
    moment,
    suggestions,
    filtersChanged,
    pickIndex,
    shufflePick,
    refresh,
    requestLocation,
  } = useNearby();

  const directions = useDirections();

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const hero = suggestions[pickIndex] ?? suggestions[0];
  const runnersUp = useMemo(
    () => suggestions.filter((s) => s.place.id !== hero?.place.id).slice(0, 4),
    [suggestions, hero],
  );

  const masthead = (
    <View style={styles.masthead}>
      <View style={styles.mastheadTop}>
        <Txt variant="label" tone="faint" uppercase numberOfLines={1} style={{ flexShrink: 1 }}>
          {WEEKDAYS[now.getDay()]} · {formatClock(now)}
        </Txt>
        {/* `source` still reads "sample" until the first fetch lands, so an
            unguarded badge flashed SAMPLE over the loading skeletons of a
            perfectly real result set — the one claim this app must never make
            carelessly. */}
        {status === 'ready' && !loading && !isLiveData ? <SampleDataBadge compact /> : null}
      </View>

      {/* The area name moved out of the timestamp line and into a control: it
          is the origin every distance is measured from, so it needs to carry
          its own freshness and a way to re-read it. */}
      {status === 'ready' ? (
        <View style={{ marginTop: space.md }}>
          <LocationStamp />
        </View>
      ) : null}
      <Txt variant="hero" style={{ marginTop: space.md }}>
        {firstName ? `${moment.greeting}, ${firstName}.` : `${moment.greeting}.`}
      </Txt>
      <Txt variant="hero" tone="accent">
        {`Here’s ${moment.label}.`}
      </Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: space.md, maxWidth: 420 }}>
        {moment.blurb}
      </Txt>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Logo />
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={filtersChanged ? 'Filters, narrowed' : 'Filters'}
          accessibilityHint="Adjust distance, rating and price"
          onPress={() => router.push('/filters')}
          style={styles.headerButton}
        >
          <View style={[styles.headerDisc, { backgroundColor: c.surfaceAlt }]}>
            <Ionicons name="options-outline" size={icon.md} color={c.text} />
            {filtersChanged ? (
              <View style={[styles.filterDot, { backgroundColor: c.accent, borderColor: c.bg }]} />
            ) : null}
          </View>
        </Touchable>
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scroll, { paddingBottom: space['3xl'] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          status === 'ready' ? (
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.textMuted} />
          ) : undefined
        }
      >
        {masthead}

        {status !== 'ready' ? (
          <LocationGate />
        ) : loading ? (
          <>
            <HeroSkeleton />
            <View style={{ height: space['2xl'] }} />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : error ? (
          <EmptyState
            iconName="cloud-offline-outline"
            title="Couldn’t load places"
            body={error}
            action={<Button label="Try again" onPress={refresh} iconName="refresh" />}
          />
        ) : hero ? (
          <>
            <HeroPick suggestion={hero} scrollY={scrollY} generation={pickIndex} />

            <View style={styles.actions}>
              <Button
                label={directions.locating ? 'Finding you…' : 'Directions'}
                iconName="navigate"
                loading={directions.locating}
                disabled={!directions.routable(hero.place)}
                onPress={() => void directions.open(hero.place)}
                accessibilityHint={
                  directions.blockedReason(hero.place) ??
                  `Reads your location, then opens walking directions to ${hero.place.name} in Google Maps`
                }
                fullWidth
              />
              <Button
                label="Another"
                iconName="shuffle"
                variant="secondary"
                onPress={shufflePick}
                accessibilityHint="Shows the next-best suggestion"
                style={{ marginLeft: space.md }}
              />
            </View>

            {/* Sits directly under the Directions button it disables, rather
                than at the foot of the screen where the explanation for a
                greyed-out control would never be read. */}
            {!isLiveData ? (
              <View style={{ marginTop: space.md }}>
                <Notice
                  tone="caution"
                  text={
                    warning ??
                    'These are made-up restaurants, laid out around your real position so the app is explorable. Directions are off because there is nowhere real to walk to.'
                  }
                />
                <Button
                  label="Use real Google listings"
                  variant="secondary"
                  iconName="key-outline"
                  onPress={() => router.push('/profile')}
                  style={{ marginTop: space.md }}
                />
              </View>
            ) : null}

            {/* OSM listings are real places, so they get no SAMPLE badge and no
                caution tone. What they do need is the reason every card says
                "No rating" — otherwise that reads as a broken app rather than
                as the honest limit of a keyless source. */}
            {source === 'osm' ? (
              <View style={{ marginTop: space.md }}>
                <Notice
                  text={
                    warning ??
                    'These are real restaurants from OpenStreetMap, ranked by distance and how well they suit this hour. It publishes no ratings, so ranking leans on the rest. Add a Google Places key for ratings and reviews.'
                  }
                />
                <Button
                  label="Add a Places key for ratings"
                  variant="secondary"
                  iconName="key-outline"
                  onPress={() => router.push('/profile')}
                  style={{ marginTop: space.md }}
                />
              </View>
            ) : null}

            {/* Also about route accuracy, so it belongs with the button and not
                three sections further down. */}
            {usingDemoLocation ? (
              <View style={{ marginTop: space.md }}>
                <Notice text="You are browsing a demo location in Kuala Lumpur, so distances and walk times are measured from there, not from you. Turn on location access for results where you actually are." />
                <Button
                  label="Use my real location"
                  variant="secondary"
                  iconName="navigate-outline"
                  onPress={requestLocation}
                  style={{ marginTop: space.md }}
                />
              </View>
            ) : null}

            {hero.reasons.length > 0 ? (
              <View style={styles.reasons}>
                {hero.reasons.map((reason, i) => (
                  <Chip key={reason} label={reason} tone={i === 0 ? 'accent' : 'neutral'} />
                ))}
              </View>
            ) : null}

            {runnersUp.length > 0 ? (
              <View style={{ marginTop: space['3xl'] }}>
                <SectionHeader title="Also worth the walk" />
                {runnersUp.map((s, i) => (
                  <PlaceRow
                    key={s.place.id}
                    suggestion={s}
                    rank={i + 2}
                    showDivider={i < runnersUp.length - 1}
                  />
                ))}
                <Button
                  label={`See all ${suggestions.length} nearby`}
                  variant="secondary"
                  onPress={() => router.push('/nearby')}
                  style={{ marginTop: space.xl }}
                />
              </View>
            ) : null}

          </>
        ) : (
          <NoMatches />
        )}
      </Animated.ScrollView>
    </View>
  );
}

/** Permission is asked for in context, with a real alternative if declined. */
function LocationGate() {
  const { c } = useTheme();
  const { status, error, requestLocation, useDemoLocation } = useNearby();

  const denied = status === 'denied';

  return (
    <View style={[styles.gate, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.gateIcon, { backgroundColor: c.accentSoft }]}>
        <Ionicons name="location-outline" size={icon.lg} color={c.onAccentSoft} />
      </View>

      <Txt variant="heading" style={{ marginTop: space.lg }}>
        {denied ? 'Location is off' : 'Start with where you are'}
      </Txt>

      <Txt variant="body" tone="muted" style={{ marginTop: space.sm }}>
        {denied
          ? 'What2Eat needs your location to rank places by how far you would actually have to walk. You can enable it in Settings, or look around a demo neighbourhood first.'
          : 'What2Eat reads your position, ranks every highly-rated kitchen around you, and hands you one answer. It re-reads before opening directions so the walk starts from where you are. Nothing is stored or sent anywhere.'}
      </Txt>

      {error ? (
        <View style={{ marginTop: space.lg }}>
          <Notice text={error} tone="caution" />
        </View>
      ) : null}

      <View style={{ marginTop: space.xl, gap: space.md }}>
        <Button
          label={status === 'asking' ? 'Checking…' : denied ? 'Try again' : 'Use my location'}
          iconName="navigate"
          disabled={status === 'asking'}
          onPress={requestLocation}
        />
        <Button label="Browse a demo neighbourhood" variant="secondary" onPress={useDemoLocation} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: space.sm,
  },
  headerButton: {
    width: MIN_TAP,
    height: MIN_TAP,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  scroll: { paddingHorizontal: SCREEN_PADDING },
  masthead: { paddingTop: space.lg, paddingBottom: space['2xl'] },
  mastheadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  actions: { flexDirection: 'row', marginTop: space.lg },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg },
  gate: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.xl,
  },
  gateIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
