import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** True when running inside the Expo Go client rather than a build of our own. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Whether a Maps SDK key was actually baked into this build.
 *
 * `app.config.ts` only emits `ios.config.googleMapsApiKey` /
 * `android.config.googleMaps.apiKey` when `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` was
 * set at build time, so their presence is the honest test. Read from the
 * resolved config rather than the env var alone, because a build made on
 * another machine carries the key in the manifest and not in this process.
 */
function hasMapsKey(): boolean {
  const config = Constants.expoConfig;
  const ios = config?.ios?.config?.googleMapsApiKey;
  const android = config?.android?.config?.googleMaps?.apiKey;
  const env = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  return [ios, android, env].some((k) => typeof k === 'string' && k.trim().length > 0);
}

const mapsKeyPresent = hasMapsKey();

/**
 * Whether Google Maps can actually render here.
 *
 * - web      — `react-native-maps` has no web implementation at all.
 * - iOS + Expo Go — the Expo Go client bundles only the Apple Maps provider, so
 *   `PROVIDER_GOOGLE` renders an empty grey view.
 * - iOS, no Maps key — the Google Maps SDK for iOS needs `provideAPIKey` before
 *   it will draw anything. Without one, a development build renders a blank
 *   view: the map "loads" but no tiles ever appear. This case used to pass the
 *   check, which is why a dev build with no `.env` showed an empty map instead
 *   of the schematic that exists precisely for it.
 * - Android  — Google Maps is the platform default and Expo Go supplies its own
 *   key, so it works there; a standalone build needs ours, or it renders the
 *   same empty grid.
 */
export const canRenderGoogleMaps =
  Platform.OS === 'android'
    ? isExpoGo || mapsKeyPresent
    : Platform.OS === 'ios'
      ? !isExpoGo && mapsKeyPresent
      : false;

export const usesSchematicMap = !canRenderGoogleMaps;

/** Explains the schematic in the UI, so a fallback never looks like a bug. */
export function schematicReason(): string {
  if (Platform.OS === 'web') return 'Schematic view · true bearings and distances';
  if (!mapsKeyPresent) {
    // Actionable, unlike "maps unavailable": this one is fixed by a build-time
    // key, and it is a *different* key from the Places one in You -> Listings,
    // which is the confusion worth heading off.
    return 'No Maps SDK key in this build · showing bearings and distances';
  }
  return 'Google Maps needs a development build on iOS · showing bearings and distances';
}
