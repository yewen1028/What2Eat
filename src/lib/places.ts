import Constants from 'expo-constants';

import { fetchGooglePlaces } from './providers/google';
import { samplePlaces } from './providers/sample';
import { Coords, Place } from './types';

export type PlacesSource = 'google' | 'sample';

export interface PlacesResult {
  places: Place[];
  source: PlacesSource;
  /** Set when a key was configured but the request did not yield live data. */
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

/**
 * Single entry point for restaurant data.
 *
 * With a Places key this returns real Google listings — real names, real
 * ratings, real opening hours. Without one it returns the built-in sample
 * neighbourhood, which is fictional and is labelled as such everywhere it is
 * shown; the app never presents invented places as real ones.
 */
export async function loadPlaces(
  origin: Coords,
  radiusMetres: number,
  runtimeKey?: string,
  signal?: AbortSignal,
): Promise<PlacesResult> {
  const key = resolveKey(runtimeKey);
  if (!key) return { places: samplePlaces(origin), source: 'sample' };

  try {
    const places = await fetchGooglePlaces(origin, radiusMetres, key, signal);
    if (places.length === 0) {
      return {
        places: samplePlaces(origin),
        source: 'sample',
        warning: 'Google returned no places within range — showing sample data instead.',
      };
    }
    return { places, source: 'google' };
  } catch (error) {
    if (signal?.aborted) throw error;
    return {
      places: samplePlaces(origin),
      source: 'sample',
      warning:
        error instanceof Error
          ? `Live listings unavailable: ${error.message}`
          : 'Live listings unavailable.',
    };
  }
}
