import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme/theme';
import { icon as iconSize, radius, space } from '../theme/tokens';
import { Touchable } from './Touchable';
import { Txt } from './Txt';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  iconName?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  /** Shows a spinner in place of the icon and blocks further presses. */
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  iconName,
  disabled,
  loading,
  fullWidth,
  style,
  accessibilityHint,
}: Props) {
  const { c } = useTheme();

  const surface: Record<string, ViewStyle> = {
    primary: { backgroundColor: c.accent },
    secondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderStrong },
    ghost: { backgroundColor: 'transparent' },
  };

  const fg = variant === 'primary' ? c.onAccent : c.text;

  return (
    <Touchable
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      haptic={variant === 'primary' ? 'medium' : 'light'}
      onPress={onPress}
      style={[styles.base, surface[variant], fullWidth && { flex: 1 }, style]}
    >
      <View style={styles.inner}>
        {loading ? (
          // Same footprint as the icon it replaces, so the label does not shift.
          <ActivityIndicator
            size="small"
            color={fg}
            style={{ width: iconSize.md, marginRight: space.sm }}
          />
        ) : iconName ? (
          <Ionicons name={iconName} size={iconSize.md} color={fg} style={{ marginRight: space.sm }} />
        ) : null}
        <Txt variant="bodyStrong" color={fg} numberOfLines={1}>
          {label}
        </Txt>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  inner: { flexDirection: 'row', alignItems: 'center' },
});
