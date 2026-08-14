import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { placeEmbedUrl } from '../lib/embed';
import { openPlace } from '../lib/maps';
import { Place } from '../lib/types';
import { useProfile } from '../state/profile';
import { useTheme } from '../theme/theme';
import { icon, radius, space } from '../theme/tokens';
import { SectionHeader } from './Layout';
import { EmbedMap } from './map/EmbedMap';
import { Touchable } from './Touchable';
import { Txt } from './Txt';

/** Tall enough to read the surrounding streets, short enough to scroll past. */
const MAP_HEIGHT = 200;

/**
 * A real Google map of one restaurant, on its detail page.
 *
 * Renders nothing at all when `placeEmbedUrl` refuses — which is every sample
 * place, and any setup without a usable key. That silence is deliberate: the
 * page already carries a SAMPLE badge and an explanation of why directions are
 * off, and a third notice saying the same thing again would be noise.
 *
 * The map itself is inert (see `EmbedMap`); this card is the interactive part,
 * handing off to the Google Maps app for panning, reviews and street view.
 */
export function PlaceMap({ place }: { place: Place }) {
  const { c } = useTheme();
  const { profile } = useProfile();

  const url = placeEmbedUrl(place, profile.placesApiKey);
  if (!url) return null;

  return (
    <View style={{ marginTop: space['2xl'] }}>
      <SectionHeader title="Where it is" />
      <Touchable
        accessibilityRole="link"
        accessibilityLabel={`Open ${place.name} in Google Maps`}
        accessibilityHint="Leaves What2Eat and opens the Google Maps app"
        onPress={() => openPlace(place)}
      >
        <View style={[styles.frame, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
          <EmbedMap url={url} title={`Map showing ${place.name}`} height={MAP_HEIGHT} />
          <View style={[styles.footer, { borderColor: c.border, backgroundColor: c.surface }]}>
            {/* Many OpenStreetMap listings have no address tagged. The footer
                is also the affordance that says the card opens Maps, so it
                says that rather than collapsing to a bare icon. */}
            <Txt variant="smallStrong" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
              {place.address || 'Open in Google Maps'}
            </Txt>
            <Ionicons name="open-outline" size={icon.sm} color={c.textFaint} />
          </View>
        </View>
      </Touchable>
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
