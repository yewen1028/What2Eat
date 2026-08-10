import type { ExpoConfig } from 'expo/config';

/**
 * Two different Google keys are involved and they are easy to confuse:
 *
 *  - MAPS key   — the native Maps SDK, baked in at build time. It cannot come
 *                 from app storage, so it must be present here when you build.
 *                 Needs "Maps SDK for iOS" and "Maps SDK for Android" enabled.
 *  - PLACES key — the restaurant listings, read at runtime. It can also be
 *                 entered in the app (You → Listings), so a user can get real
 *                 data without rebuilding. Needs "Places API (New)" enabled.
 *
 * The same key can serve both if you enable all three APIs on it.
 */
const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

const config: ExpoConfig = {
  name: 'What2Eat',
  slug: 'what2eat',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'what2eat',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    backgroundColor: '#FBF7F1',
    resizeMode: 'contain',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.what2eat.app',
    // Google Maps on iOS instead of Apple Maps. Requires a development build:
    // Expo Go ships only the Apple Maps provider.
    config: MAPS_KEY ? { googleMapsApiKey: MAPS_KEY } : undefined,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'What2Eat uses your location to find highly-rated places to eat right around you.',
      // Lets "Directions" hand off to the Google Maps app when it is installed.
      LSApplicationQueriesSchemes: ['comgooglemaps'],
    },
  },
  android: {
    package: 'com.what2eat.app',
    edgeToEdgeEnabled: true,
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    config: MAPS_KEY ? { googleMaps: { apiKey: MAPS_KEY } } : undefined,
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'What2Eat uses your location to find highly-rated places to eat right around you.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    googlePlacesApiKey: PLACES_KEY,
  },
};

export default config;
