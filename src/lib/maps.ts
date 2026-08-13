import { Linking, Platform } from 'react-native';

import { isSamplePlace } from './providers/sample';
import { Coords, Place } from './types';

/**
 * Fictional listings must never be routed to.
 *
 * `providers/sample.ts` lays its invented restaurants out as bearing/distance
 * offsets from wherever the user happens to be standing, so their coordinates
 * are a patch of road, a car park, or someone's house. Opening directions to
 * one is the single most misleading thing this app could do with sample data:
 * every other surface labels it, but a maps handoff launches a real app that
 * will confidently walk someone to nothing. The place's own id is the check
 * rather than the `isLiveData` flag, so the guard holds for a sample place
 * bookmarked in an earlier session and reopened after a key was added.
 */
export function isRoutable(place: Place): boolean {
  return !isSamplePlace(place);
}

/** Google Places (New) ids are place ids; the sample provider's are not. */
function googlePlaceId(place: Place): string | undefined {
  return isRoutable(place) ? place.id : undefined;
}

const coord = (c: Coords) => `${c.lat},${c.lng}`;

/**
 * Universal Google Maps URL.
 *
 * `origin` is passed explicitly whenever we have a fix. Leaving it out lets the
 * Maps app substitute its own idea of "here", which is what made the routes
 * wrong: with the demo origin in play, or a fix captured back at permission
 * time, the app quoted a 4 minute walk while Maps drew a route from somewhere
 * else entirely. Anchoring the route to the same coordinate the ranking used
 * keeps the two honest.
 *
 * `destination_place_id` pins the destination to the actual business rather
 * than a bare lat/lng, so Maps shows its name, hours and entrance instead of a
 * dropped pin. Google requires `destination` alongside it, so both are sent.
 */
export function directionsUrl(place: Place, origin?: Coords | null): string {
  const params = new URLSearchParams({
    api: '1',
    destination: coord(place.coords),
    travelmode: 'walking',
  });

  const placeId = googlePlaceId(place);
  if (placeId) params.set('destination_place_id', placeId);
  if (origin) params.set('origin', coord(origin));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Opens walking directions in Google Maps, never Apple Maps.
 *
 * iOS gets the `comgooglemaps://` scheme when the app is installed (declared in
 * `LSApplicationQueriesSchemes`), Android the app-linked https URL — which
 * resolves straight into the Google Maps app and, unlike `google.navigation:`,
 * carries an origin. Web and anything without Maps installed fall back to the
 * same https URL in a browser.
 *
 * Returns false when the place is not routable, so callers can say why instead
 * of appearing to do nothing.
 */
export function openDirections(place: Place, origin?: Coords | null): boolean {
  if (!isRoutable(place)) return false;

  const webUrl = directionsUrl(place, origin);

  const appUrl =
    Platform.OS === 'ios'
      ? `comgooglemaps://?daddr=${coord(place.coords)}&directionsmode=walking` +
        (origin ? `&saddr=${coord(origin)}` : '')
      : webUrl;

  Linking.openURL(appUrl)
    .catch(() => Linking.openURL(webUrl))
    .catch(() => {});

  return true;
}
