import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { EmbedMapProps } from './types';

/**
 * Origins the embed itself needs.
 *
 * `originWhitelist` gates *navigation*, and the Maps embed is not one document
 * from one host: it hands off to `maps.google.com` and pulls its tiles, sprites
 * and fonts from `googleapis.com`, `gstatic.com` and `ggpht.com`. Whitelisting
 * only `google.com` let the frame open and then blocked the map inside it, so
 * iOS showed a page that had loaded but had no tiles — "the map doesn't load
 * fully". Everything here is Google's own, and still https-only, so the
 * original point of the whitelist (no arbitrary browsing inside a card) holds.
 */
const GOOGLE_ORIGINS = [
  'https://*.google.com',
  'https://*.googleapis.com',
  'https://*.gstatic.com',
  'https://*.ggpht.com',
  'https://*.googleusercontent.com',
];

/**
 * Native: a real Google map in a WebView.
 *
 * The Embed API is the only way to get genuine tiles on iOS under Expo Go,
 * where `PROVIDER_GOOGLE` renders an empty grey view and the Maps SDK key is
 * not even read (`capability.ts`). WebView works there with no dev build, so
 * the detail page looks the same everywhere.
 *
 * `pointerEvents="none"` for the same reason as the web iframe: this lives in a
 * vertical ScrollView, and a pannable map hijacks the scroll gesture as soon as
 * a drag begins over it. The map locates the place; the card opens it.
 */
export function EmbedMap({ url, title, height, onFailed }: EmbedMapProps) {
  return (
    <View style={{ height }} pointerEvents="none" accessibilityLabel={title}>
      <WebView
        source={{ uri: url }}
        // `flex: 1` rather than a repeated height: WKWebView lays out against
        // its own frame, and a child sized only by height inside a container
        // that had not measured yet came up short on iOS, cropping the map.
        style={styles.web}
        scrollEnabled={false}
        originWhitelist={GOOGLE_ORIGINS}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        // iOS otherwise pads the scroll view by the safe-area inset it thinks
        // it needs, which pushes the map down inside a card that has already
        // accounted for insets and clips the bottom of it.
        automaticallyAdjustContentInsets={false}
        onError={onFailed}
        onHttpError={onFailed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
});
