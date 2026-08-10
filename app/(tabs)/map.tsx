import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OpenBadge, PriceLevel, Rating } from '../../src/components/Badges';
import { Button } from '../../src/components/Button';
import { EmptyState, SampleDataBadge, SCREEN_PADDING } from '../../src/components/Layout';
import { schematicReason, usesSchematicMap } from '../../src/components/map/capability';
import { MapSurface } from '../../src/components/map/MapSurface';
import { MapMarker } from '../../src/components/map/types';
import { PlaceImage } from '../../src/components/PlaceImage';
import { SaveButton } from '../../src/components/SaveButton';
import { Touchable } from '../../src/components/Touchable';
import { Txt } from '../../src/components/Txt';
import { formatDistance } from '../../src/lib/geo';
import { openDirections } from '../../src/lib/maps';
import { useNearby } from '../../src/state/nearby';
import { useTheme } from '../../src/theme/theme';
import { icon, motion, MIN_TAP, radius, space } from '../../src/theme/tokens';

/** Viewport radius. A little wider than the walk filter so context survives. */
const VIEW_RADIUS_M = 1400;

export default function MapScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, origin, areaName, suggestions, loading, isLiveData } = useNearby();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);

  const markers = useMemo<MapMarker[]>(
    () =>
      suggestions.map((s, i) => ({
        id: s.place.id,
        coords: s.place.coords,
        label: s.place.name,
        rating: s.place.rating,
        distance: s.distance,
        highlight: i < 3,
        isOpen: s.isOpen,
      })),
    [suggestions],
  );

  const selected = useMemo(
    () => suggestions.find((s) => s.place.id === selectedId) ?? null,
    [suggestions, selectedId],
  );

  if (status !== 'ready' || !origin) {
    return (
      <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top + space.xl }]}>
        <EmptyState
          iconName="map-outline"
          title="Location needed"
          body="The map plots you and every match around you. Turn on location from the Now tab to fill it in."
          action={<Button label="Go to Now" onPress={() => router.push('/')} />}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <MapSurface
        origin={origin}
        markers={markers}
        selectedId={selectedId}
        onSelect={setSelectedId}
        radiusMetres={VIEW_RADIUS_M}
        recenterKey={recenterKey}
      />

      {/* Header floats over the map rather than cropping it. */}
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <View style={[styles.headerPill, { backgroundColor: c.bg, borderColor: c.border }]}>
          <Ionicons name="location" size={icon.sm} color={c.accent} />
          <View style={{ marginLeft: space.sm, flexShrink: 1 }}>
            <Txt variant="smallStrong" numberOfLines={1}>
              {areaName ?? 'Around you'}
            </Txt>
            <Txt variant="label" tone="faint" numberOfLines={1}>
              {loading ? 'Loading…' : `${markers.length} places match`}
            </Txt>
          </View>
          {!loading && !isLiveData ? (
            <View style={{ marginLeft: space.sm }}>
              <SampleDataBadge compact />
            </View>
          ) : null}
        </View>

        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Filters"
          onPress={() => router.push('/filters')}
          style={styles.iconTap}
        >
          <View style={[styles.disc, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Ionicons name="options-outline" size={icon.md} color={c.text} />
          </View>
        </Touchable>
      </View>

      {/* Sits under the header, where nothing else competes for the space —
          the selection card makes any bottom-anchored position unreliable. */}
      {usesSchematicMap ? (
        <View style={[styles.webNote, { top: insets.top + space.sm + 58 }]} pointerEvents="none">
          <View style={[styles.notePill, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Txt variant="label" tone="faint" numberOfLines={2}>
              {schematicReason()}
            </Txt>
          </View>
        </View>
      ) : null}

      {/* Stacked under the filter button rather than bottom-right, where the
          selection card and the platform note both want to live. */}
      <View
        style={[styles.recenter, { top: insets.top + space.sm + MIN_TAP + space.xs }]}
        pointerEvents="box-none"
      >
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Centre the map on me"
          onPress={() => {
            setSelectedId(null);
            setRecenterKey((k) => k + 1);
          }}
          style={styles.iconTap}
        >
          <View style={[styles.disc, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Ionicons name="locate" size={icon.md} color={c.text} />
          </View>
        </Touchable>
      </View>

      {selected ? (
        <Animated.View
          entering={FadeInDown.duration(motion.base).easing(Easing.bezier(...motion.ease).factory())}
          exiting={FadeOutDown.duration(motion.fast)}
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              paddingBottom: Math.max(insets.bottom, space.lg),
            },
          ]}
        >
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={`Open ${selected.place.name}`}
            accessibilityHint="Opens the full listing"
            onPress={() => router.push(`/place/${selected.place.id}`)}
            scaleTo={0.99}
            style={styles.cardRow}
          >
            <PlaceImage uri={selected.place.photo} seed={selected.place.name} style={styles.thumb} />
            <View style={styles.cardBody}>
              <Txt variant="heading" numberOfLines={1}>
                {selected.place.name}
              </Txt>
              <Txt variant="small" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                {selected.place.cuisine} · {formatDistance(selected.distance)}
              </Txt>
              <View style={styles.metaRow}>
                <Rating rating={selected.place.rating} reviewCount={selected.place.reviewCount} compact />
                <View style={{ width: space.md }} />
                <PriceLevel level={selected.place.priceLevel} />
              </View>
              <View style={{ marginTop: 6 }}>
                <OpenBadge suggestion={selected} />
              </View>
            </View>
            <SaveButton place={selected.place} />
          </Touchable>

          <Button
            label={`Walk there · ${selected.walkMinutes} min`}
            iconName="navigate"
            onPress={() => openDirections(selected.place)}
            style={{ marginTop: space.md }}
          />
        </Animated.View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '78%',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconTap: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  disc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenter: { position: 'absolute', right: SCREEN_PADDING - space.xs },
  card: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 76, height: 76, borderRadius: radius.md },
  cardBody: { flex: 1, marginLeft: space.md, marginRight: space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  webNote: { position: 'absolute', left: SCREEN_PADDING, right: SCREEN_PADDING },
  notePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
