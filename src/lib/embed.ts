import { resolveKey } from './places';
import { isOsmPlace } from './providers/osm';
import { isSamplePlace } from './providers/sample';
import { Place } from './types';

/**
 * Google Maps Embed API.
 *
 * A third Google surface, and a third set of rules — see `app.config.ts` for the
 * other two. The Embed API renders a real Google map inside an iframe (web) or a
 * WebView (native), which is the only way to show genuine map tiles on web and
 * in Expo Go on iOS, where the native Maps SDK cannot render at all
 * (`components/map/capability.ts`).
 *
 * It is a *display* API: it returns a picture, never data. Nothing here can feed
 * the ranker — names, ratings and hours still come from Places
 * (`providers/google.ts`). Embedding is free and uncapped, but the key still
 * needs "Maps Embed API" enabled in Google Cloud Console alongside the others.
 */

/**
 * Two modes, because the two id kinds resolve differently.
 *
 * `place` takes a `place_id:` and renders that exact business, labelled.
 * `search` takes free text and labels whatever it finds inside the viewport —
 * which is the only mode that can name an OpenStreetMap listing, since its id
 * means nothing to Google.
 */
const EMBED_PLACE = 'https://www.google.com/maps/embed/v1/place';
const EMBED_SEARCH = 'https://www.google.com/maps/embed/v1/search';

/** Close enough to read the street the place is on, wide enough to orient. */
const ZOOM = 17;

/**
 * The Maps key first, the Places key second.
 *
 * Embedding is a maps-display job, so the build-time Maps key is the right home
 * for it. Falling back to the Places key matters for the common setup where one
 * key has all the APIs enabled and was pasted into You -> Listings at runtime:
 * without the fallback that user has a working key in hand and still gets no
 * map, for no reason they could discover.
 */
export function embedKey(runtimeKey?: string): string | undefined {
  const maps = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (maps) return maps;
  return resolveKey(runtimeKey);
}

/**
 * A map URL for one real restaurant, or null when we must not draw one.
 *
 * Sample places are refused outright. Their coordinates are bearing/distance
 * offsets from wherever the user is standing (`providers/sample.ts`), so they
 * land on an arbitrary patch of road, a car park, or someone's house. Real
 * Google tiles under an invented business name is precisely the misinformation
 * the sample dataset exists to avoid — and worse than the schematic map, which
 * at least reads as abstract.
 */
export function placeEmbedUrl(place: Place, runtimeKey?: string): string | null {
  if (isSamplePlace(place)) return null;

  const key = embedKey(runtimeKey);
  if (!key) return null;

  const shared = { key, zoom: String(ZOOM), region: 'MY', language: 'en' };

  // `place_id:` pins the pin to the actual business, so Google labels it with
  // its own name and hours rather than dropping an anonymous marker.
  if (!isOsmPlace(place)) {
    const params = new URLSearchParams({ ...shared, q: `place_id:${place.id}` });
    return `${EMBED_PLACE}?${params.toString()}`;
  }

  /**
   * An OpenStreetMap id is not a Google place id, and sending its *coordinate*
   * instead — which is what this used to do — renders a map whose only marker
   * is an anonymous dropped pin. The card sat under a heading reading "Where it
   * is" and named nothing, on the app's default keyless path.
   *
   * Search mode with a locked `center` fixes that without inventing anything:
   * the viewport stays on the coordinate OSM is authoritative about, and Google
   * labels the businesses *it* knows inside that frame. If it cannot match the
   * name, the worst case is an unlabelled map of the right block — never a
   * different restaurant presented as this one.
   */
  const params = new URLSearchParams({
    ...shared,
    q: [place.name, place.address].filter(Boolean).join(', '),
    center: `${place.coords.lat},${place.coords.lng}`,
  });

  return `${EMBED_SEARCH}?${params.toString()}`;
}
