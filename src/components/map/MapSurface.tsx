import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

import { isRated, ratingLabel } from '../../lib/score';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';
import { Txt } from '../Txt';
import { canRenderGoogleMaps } from './capability';
import { darkMapStyle, lightMapStyle } from './darkMapStyle';
import { SchematicMap } from './SchematicMap';
import { MapSurfaceProps } from './types';

/** Degrees of latitude per metre — good enough for a city-scale viewport. */
const LAT_PER_M = 1 / 111_320;

function regionFor(origin: { lat: number; lng: number }, radiusMetres: number): Region {
  const latDelta = (radiusMetres * 2.4) * LAT_PER_M;
  return {
    latitude: origin.lat,
    longitude: origin.lng,
    latitudeDelta: latDelta,
    longitudeDelta: latDelta / Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180)),
  };
}

export function MapSurface(props: MapSurfaceProps) {
  // An empty grey rectangle is a worse answer than an honest schematic, and
  // quietly dropping back to Apple Maps is not an option.
  if (!canRenderGoogleMaps) return <SchematicMap {...props} />;
  return <GoogleMap {...props} />;
}

function GoogleMap({
  origin,
  markers,
  selectedId,
  onSelect,
  radiusMetres,
  recenterKey,
}: MapSurfaceProps) {
  const { c, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const initialRegion = useMemo(() => regionFor(origin, radiusMetres), [origin, radiusMetres]);

  /**
   * Custom marker views must be re-rasterised while they change, but leaving
   * tracking on permanently pegs the frame rate. We track for a beat after
   * mount and after any selection change, then stop.
   */
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const id = setTimeout(() => setTracking(false), 900);
    return () => clearTimeout(id);
  }, [selectedId, markers.length, isDark]);

  useEffect(() => {
    if (recenterKey === 0) return;
    mapRef.current?.animateToRegion(regionFor(origin, radiusMetres), 420);
  }, [recenterKey, origin, radiusMetres]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      // Google Maps on both platforms, so the map matches the listings and
      // looks the same everywhere. On iOS this needs a development build with
      // a Maps SDK key — Expo Go only bundles the Apple Maps provider.
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion}
      customMapStyle={isDark ? darkMapStyle : lightMapStyle}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      showsPointsOfInterest={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      onPress={() => onSelect(null)}
    >
      {/* The search radius, so "nothing further out was considered" is visible. */}
      <Circle
        center={{ latitude: origin.lat, longitude: origin.lng }}
        radius={radiusMetres}
        strokeColor={c.accent + '55'}
        fillColor={c.accent + (isDark ? '10' : '0D')}
        strokeWidth={1}
      />

      {markers.map((m) => {
        const selected = m.id === selectedId;
        return (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.coords.lat, longitude: m.coords.lng }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={tracking}
            onPress={(e) => {
              e.stopPropagation();
              onSelect(m.id);
            }}
            accessibilityLabel={`${m.label}, ${ratingLabel(m.rating)}`}
            zIndex={selected ? 3 : m.highlight ? 2 : 1}
          >
            <Pin
              label={m.label}
              rating={m.rating}
              highlight={m.highlight}
              selected={selected}
              dimmed={!m.isOpen && !m.hoursUnknown}
            />
          </Marker>
        );
      })}
    </MapView>
  );
}

/**
 * Names are drawn on the pin rather than hidden in a callout — the point of the
 * map is to read the neighbourhood at a glance, not to tap eighteen dots.
 */
function Pin({
  label,
  rating,
  highlight,
  selected,
  dimmed,
}: {
  label: string;
  rating: number;
  highlight: boolean;
  selected: boolean;
  dimmed: boolean;
}) {
  const { c } = useTheme();

  const bg = selected || highlight ? c.accent : c.surface;
  const fg = selected || highlight ? c.onAccent : c.text;
  const border = selected ? c.text : highlight ? c.accent : c.border;

  return (
    <View style={styles.pinWrap}>
      <View
        style={[
          styles.pin,
          {
            backgroundColor: bg,
            borderColor: border,
            borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
            opacity: dimmed && !selected ? 0.55 : 1,
          },
        ]}
      >
        <Txt variant="labelBold" color={fg} numberOfLines={1} style={styles.pinLabel}>
          {label}
        </Txt>
        {/* An unrated place gets a name and nothing else. "0.0" on a pin is a
            damning score printed over a real business on no evidence, and the
            pin has no room to spell out "no rating" — silence is the honest
            rendering, and it matches SchematicMap, which never shows one. */}
        {isRated(rating) ? (
          <Txt variant="label" color={fg} style={styles.pinRating}>
            {rating.toFixed(1)}
          </Txt>
        ) : null}
      </View>
      <View style={[styles.pinStem, { backgroundColor: bg, borderColor: border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pinWrap: { alignItems: 'center' },
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 168,
    paddingHorizontal: space.md - 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pinLabel: { letterSpacing: 0.2, flexShrink: 1 },
  pinRating: { marginLeft: 6, opacity: 0.85, letterSpacing: 0 },
  pinStem: {
    width: 2,
    height: 8,
    marginTop: -1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});
