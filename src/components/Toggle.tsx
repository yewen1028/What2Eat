import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../theme/theme';
import { motion } from '../theme/tokens';
import { Touchable } from './Touchable';

const TRACK_W = 52;
const TRACK_H = 30;
const KNOB = 24;
const PAD = 3;

interface Props {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

/**
 * Replaces RN's `Switch`, whose thumb and track colours are only partially
 * honoured across iOS, Android and web — the web build renders a teal thumb
 * regardless of `thumbColor`. This one is the same in all three.
 */
export function Toggle({ value, onChange, accessibilityLabel, disabled }: Props) {
  const { c } = useTheme();
  const reduceMotion = useReducedMotion();

  const progress = useDerivedValue(() =>
    withTiming(value ? 1 : 0, {
      duration: reduceMotion ? 0 : motion.fast,
      easing: Easing.bezier(...motion.ease),
    }),
  );

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [c.borderStrong, c.accent]),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (TRACK_W - KNOB - PAD * 2) }],
  }));

  return (
    <Touchable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: value, disabled }}
      disabled={disabled}
      haptic="selection"
      scaleTo={0.94}
      onPress={() => onChange(!value)}
      style={styles.tap}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, { backgroundColor: '#FFFFFF' }, knobStyle]} />
      </Animated.View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  // Padded to a 44pt target without changing the control's visual size.
  tap: { minWidth: 52, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: PAD,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
