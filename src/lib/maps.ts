import { Linking, Platform } from 'react-native';

import { Place } from './types';

/** Opens walking directions in the platform's default maps app. */
export function openDirections(place: Place) {
  const { lat, lng } = place.coords;
  const label = encodeURIComponent(place.name);

  const url = Platform.select({
    ios: `maps://?daddr=${lat},${lng}&q=${label}&dirflg=w`,
    android: `google.navigation:q=${lat},${lng}&mode=w`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
  });

  const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;

  Linking.openURL(url).catch(() => Linking.openURL(webFallback).catch(() => {}));
}
