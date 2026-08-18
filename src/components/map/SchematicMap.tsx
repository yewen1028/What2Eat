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

/**
 * Vertical room kept clear of the outermost ring, for labels that slide down
 * past it. Sized for a full-screen map; a short card overrides it, because
 * subtracting 72px from a 200px frame left a 28px plot radius and stacked all
 * three ring labels on top of each other.
 */
const LABEL_RESERVE_Y = 72;

/** Breathing room between a label and the edge of the frame. */
const EDGE_INSET = 4;

/**
 * How many names the view will draw at once.
 *
 * Every marker keeps its dot; only the labels are rationed. A dense city block
 * returns 78 matches, and labelling all of them turned the de-collision into a
 * single vertical column of names running off the bottom of the screen — each
 * one displaced so far from its own dot that the map no longer answered "what
 * is near me", which is its only job. The ranker hands markers over best-first,
 * so the budget spends itself on the results the user is most likely to want.
 */
const LABEL_BUDGET = 12;

/**
 * Tap target around a dot. Deliberately under `MIN_TAP`: dots sit metres apart
 * on a dense block, and 44pt squares would overlap so heavily that the nearest
 * dot would be the only one reachable. The labels are the primary affordance
 * and keep their own larger target; this is the fallback for the unlabelled.
 */
const DOT_TAP = 32;

interface Point {
  marker: MapMarker;
  /** True position of the dot. */
  x: number;
  y: number;
}

interface Placed extends Point {
  /** Label's top edge, after collision resolution. */
  labelY: number;
  /** Label's left edge, after flipping and clamping into the frame. */
  left: number;
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
export function SchematicMap({
  origin,
  markers,
  selectedId,
  onSelect,
  radiusMetres,
  labelReserve = LABEL_RESERVE_Y,
}: MapSurfaceProps & {
  /** Vertical room to keep clear of the outer ring. Lower it in short cards. */
  labelReserve?: number;
}) {
  const { c } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const plotRadius = Math.max(0, Math.min(size.width / 2 - 16, size.height / 2 - labelReserve));
  const scale = plotRadius / radiusMetres;
  const cx = size.width / 2;
  const cy = size.height / 2;

  /** Every marker's true position. Dots are drawn from this, labels are not. */
  const points = useMemo<Point[]>(() => {
    if (size.width === 0) return [];

    return markers.map((m) => {
      const dy = (m.coords.lat - origin.lat) * M_PER_DEG_LAT;
      const dx =
        (m.coords.lng - origin.lng) * M_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);
      // Anything beyond the ring is pinned to its edge rather than clipped out.
      const dist = Math.hypot(dx, dy);
      const clamp = dist > radiusMetres ? radiusMetres / dist : 1;
      return { marker: m, x: cx + dx * scale * clamp, y: cy - dy * scale * clamp };
    });
  }, [markers, origin, cx, cy, scale, radiusMetres, size.width]);

  const placed = useMemo<Placed[]>(() => {
    if (points.length === 0) return [];

    /**
     * The budget goes to the best-ranked markers, and the selection always
     * keeps its name whatever its rank — tapping a bare dot has to tell you
     * what you tapped.
     */
    const labelled = points.slice(0, LABEL_BUDGET);
    if (selectedId && !labelled.some((p) => p.marker.id === selectedId)) {
      const chosen = points.find((p) => p.marker.id === selectedId);
      if (chosen) labelled.push(chosen);
    }

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
        left: cx - 26,
        width: 52,
      },
    ];
    for (const p of [...labelled].sort((a, b) => a.y - b.y)) {
      const width = Math.min(170, p.marker.label.length * 7.1 + 22);

      /**
       * Side first, then a hard clamp into the frame. The flip alone was not
       * enough: a dot just left of the threshold still put a long name well
       * past the right edge, and the container clips, so the name lost its
       * last few characters. Clamping keeps the label whole — only the
       * annotation moves, never the dot, so the geography stays true.
       */
      const flip = p.x > size.width * 0.55;
      const preferred = flip ? p.x - LABEL_GAP - width : p.x + LABEL_GAP;
      const left = Math.max(
        EDGE_INSET,
        Math.min(preferred, size.width - width - EDGE_INSET),
      );

      let labelY = p.y - LABEL_PITCH / 2;

      for (let guard = 0; guard < 40; guard += 1) {
        const clash = out.find(
          (q) =>
            left < q.left + q.width &&
            q.left < left + width &&
            Math.abs(labelY - q.labelY) < LABEL_PITCH,
        );
        if (!clash) break;
        labelY = clash.labelY + LABEL_PITCH;
      }

      out.push({ ...p, labelY, left, width });
    }
    return out.filter((p) => p.marker !== null);
  }, [points, selectedId, cx, cy, size.width]);

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

          {/* Every marker gets a dot, labelled or not — the labels are rationed
              but the geography is not. Dots come first so no label can obscure
              a true position, and each is tappable in its own right, which is
              what makes an unlabelled one reachable: tapping it selects the
              place, and the selection is always granted a name. */}
          {points.map((p) => {
            const selected = p.marker.id === selectedId;
            return (
              <Touchable
                key={`dot-${p.marker.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${p.marker.label}, ${ratingLabel(p.marker.rating)}, ${formatDistance(p.marker.distance)} away`}
                accessibilityState={{ selected }}
                haptic="selection"
                scaleTo={0.9}
                onPress={() => onSelect(selected ? null : p.marker.id)}
                style={[styles.dotTap, { left: p.x - DOT_TAP / 2, top: p.y - DOT_TAP / 2 }]}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: selected || p.marker.highlight ? c.accent : c.text,
                      borderColor: c.surfaceAlt,
                      // Same rule as the label below: dimming means "shut right
                      // now", so a place whose hours nobody recorded stays at
                      // full strength rather than greyed out on no evidence.
                      opacity: p.marker.isOpen || p.marker.hoursUnknown ? 1 : 0.5,
                    },
                  ]}
                />
              </Touchable>
            );
          })}

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
                  {
                    left: p.left,
                    width: p.width,
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
  dotTap: {
    position: 'absolute',
    width: DOT_TAP,
    height: DOT_TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
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
