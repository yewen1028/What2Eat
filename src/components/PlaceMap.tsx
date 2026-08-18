import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { placeEmbedUrl } from '../lib/embed';
import { distanceMetres } from '../lib/geo';
import { openPlace } from '../lib/maps';
import { isSamplePlace } from '../lib/providers/sample';
import { Place } from '../lib/types';
import { useNearby } from '../state/nearby';
import { useProfile } from '../state/profile';
import { useTheme } from '../theme/theme';
import { icon, radius, space } from '../theme/tokens';
import { SectionHeader } from './Layout';
import { EmbedMap } from './map/EmbedMap';
import { SchematicMap } from './map/SchematicMap';
import { Touchable } from './Touchable';
import { Txt } from './Txt';

/** Tall enough to read the surrounding streets, short enough to scroll past. */
const MAP_HEIGHT = 200;

/** Leaves the place comfortably inside the outer ring rather than on it. */
const SCHEMATIC_HEADROOM = 1.3;

/** A schematic of one place still needs a scale worth labelling. */
const MIN_SCHEMATIC_RADIUS_M = 150;

/** Vertical room for the labels, tuned to this card rather than a full screen. */
const SCHEMATIC_LABEL_RESERVE = 30;

/**
 * Where one restaurant is, and the way through to its reviews.
 *
 * Real Google tiles when a key can produce them, and a schematic of the walk
 * when none can. The fallback is the part that matters: no key is the app's
 * *default* state — OpenStreetMap needs none — and this card used to render
 * nothing at all in that case, so the single most common setup had a detail
 * page with no map, no bearing, and no route to the reviews the user came for.
 * Silence also read as a bug rather than as a missing key.
 *
 * Sample places are the one case that still renders nothing. Their coordinates
 * are offsets from wherever the user happens to be standing, so both a real map
 * and a true-bearing schematic would place an invented business on a real patch
 * of road. The page already carries a SAMPLE badge and says why directions are
 * off; a map is the one thing that cannot be made honest here.
 */
export function PlaceMap({ place }: { place: Place }) {
  const { c } = useTheme();
  const { profile } = useProfile();
  const { origin } = useNearby();

  if (isSamplePlace(place)) return null;

  const url = placeEmbedUrl(place, profile.placesApiKey);

  return (
    <View style={{ marginTop: space['2xl'] }}>
      <SectionHeader title="Where it is" />
      <Touchable
        accessibilityRole="link"
        accessibilityLabel={`Photos and reviews for ${place.name} on Google Maps`}
        accessibilityHint="Leaves What2Eat and opens the Google Maps app"
        onPress={() => openPlace(place)}
      >
        <View style={[styles.frame, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
          {url ? (
            <EmbedMap url={url} title={`Map showing ${place.name}`} height={MAP_HEIGHT} />
          ) : (
            <SchematicFallback place={place} origin={origin} />
          )}

          <View style={[styles.footer, { borderColor: c.border, backgroundColor: c.surface }]}>
            <View style={{ flex: 1 }}>
              {/* Many OpenStreetMap listings have no address tagged at all. */}
              {place.address ? (
                <Txt variant="smallStrong" tone="muted" numberOfLines={1}>
                  {place.address}
                </Txt>
              ) : null}
              {/* Says what the tap does, rather than leaving it to an icon.
                  Ratings and reviews are the thing a keyless source cannot
                  give, so the way to reach them has to be spelled out — not
                  implied by a card that happens to be tappable. */}
              <Txt
                variant="smallStrong"
                tone="accent"
                numberOfLines={1}
                style={place.address ? { marginTop: 2 } : undefined}
              >
                Photos and reviews on Google Maps
              </Txt>
            </View>
            <Ionicons name="open-outline" size={icon.sm} color={c.textFaint} />
          </View>
        </View>
      </Touchable>
    </View>
  );
}

/**
 * True bearing and true distance, drawn rather than tiled.
 *
 * The same component the Map tab falls back to on web and in Expo Go, so this
 * is a surface the app already stands behind — it answers "which way, and how
 * far" without pretending to be a street map. Non-interactive here: the whole
 * card is one tap through to Google Maps.
 */
function SchematicFallback({ place, origin }: { place: Place; origin: ReturnType<typeof useNearby>['origin'] }) {
  const { c } = useTheme();

  // No fix means no bearing to draw. Distances on this page come from the same
  // origin, so if it is missing there is nothing truthful to plot.
  if (!origin) {
    return (
      <View style={[styles.blank, { height: MAP_HEIGHT, backgroundColor: c.surfaceAlt }]}>
        <Ionicons name="map-outline" size={icon.lg} color={c.textFaint} />
        <Txt variant="small" tone="faint" style={{ marginTop: space.sm }}>
          Location needed to place this on a map
        </Txt>
      </View>
    );
  }

  const away = distanceMetres(origin, place.coords);
  const reach = Math.max(MIN_SCHEMATIC_RADIUS_M, away * SCHEMATIC_HEADROOM);

  return (
    <View style={{ height: MAP_HEIGHT }} pointerEvents="none">
      <SchematicMap
        // One marker in a short frame: the full-screen reserve would leave a
        // plot radius of a couple of dozen pixels and stack the ring labels.
        labelReserve={SCHEMATIC_LABEL_RESERVE}
        origin={origin}
        markers={[
          {
            id: place.id,
            coords: place.coords,
            label: place.name,
            rating: place.rating,
            distance: away,
            highlight: true,
            // Open state belongs to the badge at the top of the page, which has
            // the room to distinguish "closed" from "hours unknown". A lone dot
            // here can only muddle that, so it stays undimmed.
            isOpen: true,
            hoursUnknown: place.hoursUnknown ?? false,
          },
        ]}
        selectedId={null}
        onSelect={() => {}}
        radiusMetres={reach}
        // One place, plotted at its true distance — there is no filter edge to
        // draw here, and the rings already carry the scale.
        reachMetres={reach}
        recenterKey={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    // Keeps the embed's own square corners inside our rounded ones.
    overflow: 'hidden',
  },
  blank: { alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
