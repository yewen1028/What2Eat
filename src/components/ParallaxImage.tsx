import React from 'react';
import { StyleProp, StyleSheet, useWindowDimensions, ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  measure,
  SharedValue,
  useAnimatedRef,
  useAnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';

import { PlaceImage } from './PlaceImage';

/**
 * How far the photo drifts inside its frame, top of screen to bottom. The
 * frame is overscanned by the same amount at both ends, so no edge is ever
 * exposed.
 */
const DEFAULT_DRIFT = 9;

interface Props {
  uri?: string;
  seed: string;
  /** The frame's own size and shape. Overscan happens inside it. */
  style?: StyleProp<ViewStyle>;
  /**
   * The list's scroll offset. Only a driver: it makes the style re-run each
   * frame, and the real position comes from `measure`. Omit it and the image
   * simply sits still, which is what every non-scrolling caller wants.
   */
  scrollY?: SharedValue<number>;
  drift?: number;
  accessibilityLabel?: string;
}

/**
 * A thumbnail that drifts against the scroll.
 *
 * Position comes from `measure()` rather than from a row index or a measured
 * offset, because these render inside a recycling `FlatList` where neither is
 * reliable — a row's `onLayout` y is relative to its cell, not the content, and
 * a recycled row keeps the previous item's numbers for a frame. `measure` reads
 * where the frame actually is on screen, so a recycled row is correct
 * immediately.
 *
 * `measure` is not reactive on its own, hence the `scrollY` read: it is what
 * marks this style dirty while the list moves.
 */
export function ParallaxImage({ uri, seed, style, scrollY, drift = DEFAULT_DRIFT, accessibilityLabel }: Props) {
  const frameRef = useAnimatedRef<Animated.View>();
  const reduceMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();

  /**
   * Only a photograph is worth drifting. The fallback is a flat tint with a
   * centred initial, and sliding that produces no parallax at all — just a
   * letter that wanders off centre and a `measure()` on every scroll frame for
   * nothing. Most listings are the fallback, so this is also where the cost is.
   */
  const drifts = !!uri;

  const inner = useAnimatedStyle(() => {
    if (!scrollY || reduceMotion || !drifts) return { transform: [{ translateY: 0 }] };

    // Read, but unused: this is the dependency that re-runs the worklet on
    // every scroll frame. Without it the style would be computed once.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    scrollY.value;

    const frame = measure(frameRef);
    // Null before the first layout, and on any frame the view is detached.
    if (frame === null) return { transform: [{ translateY: 0 }] };

    // 0 when the frame's centre is at the top of the screen, 1 at the bottom.
    const progress = (frame.pageY + frame.height / 2) / windowHeight;

    return {
      transform: [
        { translateY: interpolate(progress, [0, 1], [drift, -drift], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View ref={frameRef} style={[styles.frame, style]}>
      <Animated.View style={[styles.inner, { top: -drift, bottom: -drift }, inner]}>
        <PlaceImage
          uri={uri}
          seed={seed}
          style={StyleSheet.absoluteFill as never}
          accessibilityLabel={accessibilityLabel}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Clips the overscan. The radius lives here so the drifting image is cut to
  // the frame's shape rather than showing square corners at the extremes.
  frame: { overflow: 'hidden' },
  inner: { position: 'absolute', left: 0, right: 0 },
});
