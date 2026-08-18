import { Linking, Platform } from 'react-native';

import { isOsmPlace } from './providers/osm';
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

/**
 * Only Google Places (New) ids are Google place ids.
 *
 * OpenStreetMap listings are real and route perfectly well by coordinate, but
 * their ids mean nothing to Google — passing one as `destination_place_id`
 * makes Maps reject the whole link rather than ignore the parameter.
 */
function googlePlaceId(place: Place): string | undefined {
  return isRoutable(place) && !isOsmPlace(place) ? place.id : undefined;
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

/** Close enough to read the block a place sits on, for an anchored search. */
const NEIGHBOURHOOD_ZOOM = 18;

/**
 * The place's own Google Maps page, rather than a route to it.
 *
 * What the embedded map on the detail page opens when tapped: the embed is
 * deliberately non-interactive, so this is how a user gets to pan, read reviews
 * or check the street view. Routing is a separate, more committal action and
 * keeps its own button.
 *
 * The two id kinds need two different URLs, and sending both down the
 * coordinate path was why this handoff felt broken: `query=lat,lng` opens a
 * *dropped pin*, which carries no name, no hours and no reviews. That is the
 * one screen a user tapping "read the reviews" came for, and every keyless
 * session — the app's default, since OpenStreetMap needs no key — got it.
 */
export function placeUrl(place: Place): string | null {
  if (!isRoutable(place)) return null;

  const placeId = googlePlaceId(place);
  if (placeId) {
    // The exact listing, by id. Google resolves its own page from this, so the
    // name, hours and reviews are guaranteed to be the ones we ranked.
    const params = new URLSearchParams({
      api: '1',
      query: coord(place.coords),
      query_place_id: placeId,
    });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }

  /**
   * OpenStreetMap listings have no Google id, so the name has to do the work.
   * The `@lat,lng,zoom` viewport is what keeps that honest: it anchors the
   * search to the block the restaurant is actually on, so a chain name resolves
   * to *this* branch rather than one across town. The address is folded into
   * the query when OSM tagged one, so both signals point the same way, and the
   * worst case is a search centred on the correct spot rather than a wrong
   * listing.
   */
  const query = [place.name, place.address].filter(Boolean).join(', ');
  return (
    `https://www.google.com/maps/search/${encodeURIComponent(query)}` +
    `/@${place.coords.lat},${place.coords.lng},${NEIGHBOURHOOD_ZOOM}z`
  );
}

/** Opens the place's Google Maps page. Returns false when it is not a real one. */
export function openPlace(place: Place): boolean {
  const url = placeUrl(place);
  if (!url) return false;
  Linking.openURL(url).catch(() => {});
  return true;
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
