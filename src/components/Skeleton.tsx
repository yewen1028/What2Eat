import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme/theme';
import { radius, space } from '../theme/tokens';

/** A single shimmering block. Reserves layout so nothing shifts on load. */
export function SkeletonBlock({
  height,
  width = '100%',
  round = radius.md,
  style,
}: {
  height: number;
  width?: DimensionValue;
  round?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const pulse = useSharedValue(0.55);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { height, width, borderRadius: round, backgroundColor: c.surfaceAlt },
        animated,
        style,
      ]}
    />
  );
}

/** Matches the shape of the hero pick so the swap-in is invisible. */
export function HeroSkeleton() {
  return (
    <View>
      <SkeletonBlock height={380} round={radius.xl} />
      <View style={{ height: space.lg }} />
      <SkeletonBlock height={52} />
    </View>
  );
}

export function RowSkeleton() {
  const { c } = useTheme();
  return (
    <View style={[styles.row, { borderColor: c.border }]}>
      <SkeletonBlock height={84} width={84} round={radius.md} />
      <View style={styles.rowBody}>
        <SkeletonBlock height={18} width="72%" round={radius.sm} />
        <SkeletonBlock height={14} width="48%" round={radius.sm} style={{ marginTop: space.sm }} />
        <SkeletonBlock height={14} width="36%" round={radius.sm} style={{ marginTop: space.sm }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, marginLeft: space.lg, justifyContent: 'center' },
});
