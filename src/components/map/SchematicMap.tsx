import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { formatDistance } from '../../lib/geo';
import { ratingLabel } from '../../lib/score';
import { useTheme } from '../../theme/theme';
import { radius, space } from '../../theme/tokens';
import { Touchable } from '../Touchable';
import { Txt } from '../Txt';
import { MapMarker, MapSurfaceProps } from './types';

const M_PER_DEG_LAT = 111_320;
/** Vertical room one label occupies, including its breathing space. */
const LABEL_PITCH = 24;
const LABEL_GAP = 9;

interface Placed {
  marker: MapMarker;
  /** True position of the dot. */
  x: number;
  y: number;
  /** Label's top edge, after collision resolution. */
  labelY: number;
  /** Label sits to the left of the dot when the dot is near the right edge. */
  flip: boolean;
  width: number;
}

/**
 * A schematic stand-in for a tile map: true bearings and true distances plotted
 * around you, with range rings for scale.
 *
 * Used wherever Google Maps cannot render — the web (react-native-maps has no
 * web implementation) and Expo Go on iOS (which ships only the Apple Maps
 * provider). It answers the same question the map answers — what is around me,
 * and how far — without pretending to be something it is not, and without
 * silently falling back to Apple Maps.
 */
export function SchematicMap({ origin, markers, selectedId, onSelect, radiusMetres }: MapSurfaceProps) {
  const { c } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const plotRadius = Math.max(0, Math.min(size.width / 2 - 16, size.height / 2 - 72));
  const scale = plotRadius / radiusMetres;
  const cx = size.width / 2;
  const cy = size.height / 2;

  const placed = useMemo<Placed[]>(() => {
    if (size.width === 0) return [];

    const points = markers.map((m) => {
      const dy = (m.coords.lat - origin.lat) * M_PER_DEG_LAT;
      const dx =
        (m.coords.lng - origin.lng) * M_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);
      // Anything beyond the ring is pinned to its edge rather than clipped out.
      const dist = Math.hypot(dx, dy);
      const clamp = dist > radiusMetres ? radiusMetres / dist : 1;
      return { marker: m, x: cx + dx * scale * clamp, y: cy - dy * scale * clamp };
    });

    // Greedy top-to-bottom de-collision: a label that would sit on top of one
    // already placed slides down. Dots stay at their true positions, so the
    // geography is never distorted — only the annotation moves.
    // The "You" chip is seeded as an immovable occupant so labels route around
    // it rather than burying the user's own position.
    const out: Placed[] = [
      {
        marker: null as unknown as MapMarker,
        x: cx - 26 - LABEL_GAP,
        y: cy,
        labelY: cy + 14,
        flip: false,
        width: 52,
      },
    ];
    for (const p of [...points].sort((a, b) => a.y - b.y)) {
      const flip = p.x > size.width * 0.55;
      const width = Math.min(170, p.marker.label.length * 7.1 + 22);
      const left = flip ? p.x - LABEL_GAP - width : p.x + LABEL_GAP;
      let labelY = p.y - LABEL_PITCH / 2;

      for (let guard = 0; guard < 40; guard += 1) {
        const clash = out.find((q) => {
          const qLeft = q.flip ? q.x - LABEL_GAP - q.width : q.x + LABEL_GAP;
          const overlapsX = left < qLeft + q.width && qLeft < left + width;
          return overlapsX && Math.abs(labelY - q.labelY) < LABEL_PITCH;
        });
        if (!clash) break;
        labelY = clash.labelY + LABEL_PITCH;
      }

      out.push({ ...p, labelY, flip, width });
    }
    return out.filter((p) => p.marker !== null);
  }, [markers, origin, cx, cy, scale, radiusMetres, size.width]);

  const rings = [0.34, 0.67, 1];

  return (
    <View style={[styles.container, { backgroundColor: c.surfaceAlt }]} onLayout={onLayout}>
      {size.width === 0 ? null : (
        <>
          {rings.map((r) => {
            const px = plotRadius * r;
            return (
              <View
                key={r}
                pointerEvents="none"
                style={[
                  styles.ring,
                  {
                    borderColor: c.border,
                    width: px * 2,
                    height: px * 2,
                    borderRadius: px,
                    left: cx - px,
                    top: cy - px,
                  },
                ]}
              >
                <Txt variant="label" tone="faint" style={[styles.ringLabel, { left: px - 24 }]}>
                  {formatDistance(radiusMetres * r)}
                </Txt>
              </View>
            );
          })}

          {/* Dots first, so no label can obscure a true position. */}
          {placed.map((p) => (
            <View
              key={`dot-${p.marker.id}`}
              pointerEvents="none"
              style={[
                styles.dot,
                {
                  left: p.x - 5,
                  top: p.y - 5,
                  backgroundColor:
                    p.marker.id === selectedId || p.marker.highlight ? c.accent : c.text,
                  borderColor: c.surfaceAlt,
                  opacity: p.marker.isOpen ? 1 : 0.5,
                },
              ]}
            />
          ))}

          {/* You sit above every label — the one thing on this view that must
              never be obscured is where the user actually is. */}
          <View
            pointerEvents="none"
            style={[styles.youWrap, { left: cx - 10, top: cy - 10 }]}
            accessibilityLabel="Your location"
          >
            <View style={[styles.you, { backgroundColor: c.accent, borderColor: c.bg }]} />
            <View style={[styles.youChip, { backgroundColor: c.text }]}>
              <Txt variant="labelBold" color={c.bg} uppercase>
                You
              </Txt>
            </View>
          </View>

          {placed.map((p) => {
            const selected = p.marker.id === selectedId;
            const accent = selected || p.marker.highlight;
            return (
              <Touchable
                key={p.marker.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.marker.label}, ${ratingLabel(p.marker.rating)}, ${formatDistance(p.marker.distance)} away`}
                accessibilityState={{ selected }}
                haptic="selection"
                scaleTo={0.94}
                onPress={() => onSelect(selected ? null : p.marker.id)}
                style={[
                  styles.label,
                  p.flip
                    ? { right: size.width - p.x + LABEL_GAP }
                    : { left: p.x + LABEL_GAP },
                  {
                    top: p.labelY,
                    zIndex: selected ? 3 : p.marker.highlight ? 2 : 1,
                    // Dimming says "shut right now". A place whose hours nobody
                  // recorded is not known to be shut, so it stays at full
                  // strength rather than being greyed out on no evidence.
                  opacity: p.marker.isOpen || p.marker.hoursUnknown || selected ? 1 : 0.62,
                    backgroundColor: accent ? c.accent : c.surface,
                    borderColor: selected ? c.text : accent ? c.accent : c.border,
                    borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Txt
                  variant="labelBold"
                  color={accent ? c.onAccent : c.text}
                  numberOfLines={1}
                  style={{ letterSpacing: 0.2 }}
                >
                  {p.marker.label}
                </Txt>
              </Touchable>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  ring: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth },
  ringLabel: { position: 'absolute', top: -9, width: 48, textAlign: 'center' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  youWrap: { position: 'absolute', alignItems: 'center', zIndex: 6 },
  you: { width: 20, height: 20, borderRadius: 10, borderWidth: 4 },
  youChip: {
    marginTop: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  label: {
    position: 'absolute',
    maxWidth: 170,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
});
