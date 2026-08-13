import React, { useCallback } from 'react';
import { AccessibilityRole, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { impact, selection } from '../lib/haptics';
import { motion } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Scale on press. Transform only — never affects surrounding layout. */
  scaleTo?: number;
  haptic?: false | 'light' | 'medium' | 'selection';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: { selected?: boolean; disabled?: boolean; busy?: boolean };
  hitSlop?: number | { top: number; bottom: number; left: number; right: number };
  children: React.ReactNode;
}

/**
 * The single tappable primitive. Gives every control the same press feedback
 * (a small scale plus a dip in opacity, both under 160ms) and keeps haptics
 * consistent, so nothing in the app feels inert.
 */
export function Touchable({
  onPress,
  onLongPress,
  disabled,
  scaleTo = motion.pressScale,
  haptic = 'light',
  style,
  accessibilityRole = 'button',
  accessibilityState,
  children,
  ...a11y
}: Props) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  // The disabled dimming lives inside the animated style: Reanimated writes
  // opacity inline, which would otherwise win over any static style set after
  // it and leave disabled controls looking fully enabled.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - (reduceMotion ? 1 : scaleTo)) }],
    opacity: (disabled ? 0.4 : 1) - pressed.value * 0.14,
  }));

  const handlePress = useCallback(() => {
    if (haptic === 'selection') selection();
    else if (haptic) impact(haptic);
    onPress?.();
  }, [haptic, onPress]);

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      {...a11y}
      // After the spread: `accessibilityState` is destructured out of `a11y`
      // above precisely so this merge survives. Spreading it last used to
      // replace the whole object and drop `disabled`, leaving every disabled
      // control announced as tappable.
      accessibilityState={{ disabled, ...accessibilityState }}
      disabled={disabled}
      onLongPress={onLongPress}
      onPress={handlePress}
      onPressIn={() => (pressed.value = withTiming(1, { duration: 90 }))}
      onPressOut={() => (pressed.value = withTiming(0, { duration: motion.fast }))}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
