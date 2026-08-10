import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Place } from '../lib/types';
import { useSaved } from '../state/saved';
import { useTheme } from '../theme/theme';
import { icon, MIN_TAP } from '../theme/tokens';
import { Touchable } from './Touchable';

interface Props {
  place: Place;
  /** Renders as a translucent disc for use over a photo. */
  onPhoto?: boolean;
}

export function SaveButton({ place, onPhoto }: Props) {
  const { c } = useTheme();
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(place.id);

  const tint = onPhoto ? '#FFFFFF' : saved ? c.accent : c.textMuted;

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={saved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
      accessibilityState={{ selected: saved }}
      haptic="selection"
      onPress={() => toggle(place)}
      style={styles.tap}
    >
      <View
        style={[
          styles.disc,
          onPhoto
            ? { backgroundColor: 'rgba(20, 14, 11, 0.42)' }
            : { backgroundColor: c.surfaceAlt },
        ]}
      >
        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={icon.md} color={tint} />
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  tap: {
    width: MIN_TAP,
    height: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
