import React from 'react';

import { EmbedMapProps } from './types';

/**
 * Web: a real Google map in an iframe.
 *
 * Metro's platform resolution picks this over `EmbedMap.tsx`, so the WebView
 * dependency never enters the web bundle — the same split `MapSurface` uses to
 * keep `react-native-maps` out of it.
 *
 * `pointerEvents: none` is deliberate. This sits inside a vertical ScrollView,
 * and a pannable map there swallows the scroll gesture the moment a drag starts
 * over it, which strands the user mid-page. The map's job here is to say *where*
 * the place is; the card around it handles opening the real thing.
 */
export function EmbedMap({ url, title, height }: EmbedMapProps) {
  return (
    <iframe
      src={url}
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      style={{ border: 0, width: '100%', height, display: 'block', pointerEvents: 'none' }}
    />
  );
}
