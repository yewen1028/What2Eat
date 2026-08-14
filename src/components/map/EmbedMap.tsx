import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { EmbedMapProps } from './types';

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
export function EmbedMap({ url, title, height }: EmbedMapProps) {
  return (
    <View style={{ height }} pointerEvents="none" accessibilityLabel={title}>
      <WebView
        source={{ uri: url }}
        style={{ height, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        // The embed is a single Google page; there is nothing to navigate to,
        // and letting it follow links would drop a browser inside the card.
        originWhitelist={['https://*.google.com']}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
      />
    </View>
  );
}
