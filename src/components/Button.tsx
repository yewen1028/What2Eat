import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

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
      disabled={disabled}
      haptic={variant === 'primary' ? 'medium' : 'light'}
      onPress={onPress}
      style={[styles.base, surface[variant], fullWidth && { flex: 1 }, style]}
    >
      <View style={styles.inner}>
        {iconName ? (
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
