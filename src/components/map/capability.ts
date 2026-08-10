import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** True when running inside the Expo Go client rather than a build of our own. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Whether Google Maps can actually render here.
 *
 * - web      — `react-native-maps` has no web implementation at all.
 * - iOS + Expo Go — the Expo Go client bundles only the Apple Maps provider, so
 *   `PROVIDER_GOOGLE` renders an empty grey view. A development build
 *   (`npx expo run:ios`) with a Maps SDK key is required.
 * - Android  — Google Maps is the platform default and works in Expo Go.
 */
export const canRenderGoogleMaps = Platform.OS === 'android' || (Platform.OS === 'ios' && !isExpoGo);

export const usesSchematicMap = !canRenderGoogleMaps;

/** Explains the schematic in the UI, so a fallback never looks like a bug. */
export function schematicReason(): string {
  if (Platform.OS === 'web') return 'Schematic view · true bearings and distances';
  return 'Google Maps needs a development build on iOS · showing bearings and distances';
}
