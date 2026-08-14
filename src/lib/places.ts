import Constants from 'expo-constants';

import { fetchGooglePlaces } from './providers/google';
import { fetchOsmPlaces } from './providers/osm';
import { samplePlaces } from './providers/sample';
import { Coords, Place } from './types';

export type PlacesSource = 'google' | 'osm' | 'sample';

/** False only for the fictional dataset. Both real sources are real places. */
export function isRealSource(source: PlacesSource): boolean {
  return source !== 'sample';
}

export interface PlacesResult {
  places: Place[];
  source: PlacesSource;
  /** Set when a source was tried and did not yield what it should have. */
  warning?: string;
}

/** A key shipped with the build, via `extra` or `EXPO_PUBLIC_…`. */
export function buildTimeKey(): string | undefined {
  const fromExtra = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)
    ?.googlePlacesApiKey;
  const key =
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
    (typeof fromExtra === 'string' ? fromExtra : undefined);
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

/** The key actually used: whatever the user entered wins over the build's. */
export function resolveKey(runtimeKey?: string): string | undefined {
  const trimmed = runtimeKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : buildTimeKey();
}

const describe = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/**
 * Single entry point for restaurant data. Three sources, best first.
 *
 *   1. Google Places — real names, ratings, hours and prices. Needs a key.
 *   2. OpenStreetMap — real names and real coordinates, no key and no billing,
 *      but no ratings and often no hours or price.
 *   3. The sample neighbourhood — fictional, and labelled as such everywhere.
 *
 * The order matters more than it looks. Falling straight from "no key" to
 * invented restaurants was the app's worst default: the listings looked
 * plausible, sat at believable distances, and were not places. OSM makes the
 * keyless path *real* — every listing is a business you can verify on any map —
 * so the fiction is now only ever a last resort for when both networks fail.
 */
export async function loadPlaces(
  origin: Coords,
  radiusMetres: number,
  runtimeKey?: string,
  signal?: AbortSignal,
): Promise<PlacesResult> {
  const key = resolveKey(runtimeKey);
  let warning: string | undefined;

  if (key) {
    try {
      const places = await fetchGooglePlaces(origin, radiusMetres, key, signal);
      if (places.length > 0) return { places, source: 'google' };
      warning = 'Google returned no places within range.';
    } catch (error) {
      if (signal?.aborted) throw error;
      warning = `Google listings unavailable: ${describe(error, 'the request failed')}.`;
    }
  }

  try {
    const places = await fetchOsmPlaces(origin, radiusMetres, signal);
    if (places.length > 0) {
      return {
        places,
        source: 'osm',
        // Only worth saying when Google was expected to answer and did not;
        // with no key at all, OSM is simply how the app works.
        warning: warning ? `${warning} Showing OpenStreetMap listings instead.` : undefined,
      };
    }
    warning = warning ?? 'No restaurants are mapped within range.';
  } catch (error) {
    if (signal?.aborted) throw error;
    warning = warning ?? `${describe(error, 'OpenStreetMap is unreachable')}.`;
  }

  return {
    places: samplePlaces(origin),
    source: 'sample',
    warning: `${warning} Showing the sample neighbourhood, which is fictional.`,
  };
}
