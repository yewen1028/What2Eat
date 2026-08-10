import { Linking, Platform } from 'react-native';

import { Place } from './types';

/**
 * Opens walking directions in Google Maps.
 *
 * iOS gets the `comgooglemaps://` scheme when the app is installed (declared in
 * `LSApplicationQueriesSchemes`), Android the `google.navigation:` intent, and
 * everything falls back to Google Maps on the web — never Apple Maps.
 */
export function openDirections(place: Place) {
  const { lat, lng } = place.coords;

  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;

  const appUrl = Platform.select({
    ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=walking`,
    android: `google.navigation:q=${lat},${lng}&mode=w`,
    default: webUrl,
  });

  Linking.openURL(appUrl)
    .catch(() => Linking.openURL(webUrl))
    .catch(() => {});
}
