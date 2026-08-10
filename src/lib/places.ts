import Constants from 'expo-constants';

import { fetchGooglePlaces } from './providers/google';
import { samplePlaces } from './providers/sample';
import { Coords, Place } from './types';

export type PlacesSource = 'google' | 'sample';

export interface PlacesResult {
  places: Place[];
  source: PlacesSource;
  /** Set when a live provider was configured but failed, and we fell back. */
  warning?: string;
}

function apiKey(): string | undefined {
  const fromExtra = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)
    ?.googlePlacesApiKey;
  const key =
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
    (typeof fromExtra === 'string' ? fromExtra : undefined);
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

export function hasLiveProvider(): boolean {
  return apiKey() !== undefined;
}

/**
 * Single entry point for restaurant data. Uses Google Places when a key is
 * configured and falls back to the built-in neighbourhood otherwise, so the
 * app is never a dead end.
 */
export async function loadPlaces(
  origin: Coords,
  radiusMetres: number,
  signal?: AbortSignal,
): Promise<PlacesResult> {
  const key = apiKey();
  if (!key) return { places: samplePlaces(origin), source: 'sample' };

  try {
    const places = await fetchGooglePlaces(origin, radiusMetres, key, signal);
    if (places.length === 0) {
      return {
        places: samplePlaces(origin),
        source: 'sample',
        warning: 'No live results nearby — showing the sample neighbourhood.',
      };
    }
    return { places, source: 'google' };
  } catch (error) {
    if (signal?.aborted) throw error;
    return {
      places: samplePlaces(origin),
      source: 'sample',
      warning: error instanceof Error ? error.message : 'Live results unavailable.',
    };
  }
}
