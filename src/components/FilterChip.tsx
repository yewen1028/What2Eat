import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme';
import { icon, radius, space } from '../theme/tokens';
import { Touchable } from './Touchable';
import { Txt } from './Txt';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Announced to screen readers in place of the bare label. */
  accessibilityLabel?: string;
}

/**
 * Selected state is carried by fill, border weight *and* a check glyph — so it
 * survives greyscale and low-vision use.
 */
export function FilterChip({ label, selected, onPress, iconName, accessibilityLabel }: Props) {
  const { c } = useTheme();

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      haptic="selection"
      onPress={onPress}
      scaleTo={0.96}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? c.accentSoft : c.surface,
          borderColor: selected ? c.accent : c.border,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.inner}>
        {selected ? (
          <Ionicons
            name="checkmark"
            size={icon.sm}
            color={c.onAccentSoft}
            style={{ marginRight: 5 }}
          />
        ) : iconName ? (
          <Ionicons name={iconName} size={icon.sm} color={c.textMuted} style={{ marginRight: 5 }} />
        ) : null}
        <Txt variant="smallStrong" color={selected ? c.onAccentSoft : c.text}>
          {label}
        </Txt>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
  },
  inner: { flexDirection: 'row', alignItems: 'center' },
});
