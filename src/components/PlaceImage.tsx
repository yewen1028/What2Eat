import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme/theme';
import { fonts } from '../theme/tokens';
import { Txt } from './Txt';

/** Deterministic warm hues so a place always renders the same placeholder. */
const HUES = [18, 28, 36, 8, 44, 350];

function hueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return HUES[Math.abs(hash) % HUES.length];
}

interface Props {
  uri?: string;
  /** Drives the fallback colour and initial. */
  seed: string;
  style?: StyleProp<ViewStyle>;
  /** Darkens the lower half so overlaid text stays legible. */
  scrim?: boolean;
  accessibilityLabel?: string;
}

/**
 * Photos are the least reliable part of any restaurant dataset, so the
 * fallback is designed rather than apologised for: a tinted field with the
 * place's initial set in the display face.
 */
export function PlaceImage({ uri, seed, style, scrim, accessibilityLabel }: Props) {
  const { c, isDark } = useTheme();
  const [failed, setFailed] = useState(false);
  const hue = hueFor(seed);

  const showPhoto = !!uri && !failed;

  return (
    <View style={[styles.container, { backgroundColor: c.surfaceAlt }, style]}>
      {/* The tinted field sits underneath at all times, so a slow or missing
          photo reveals something designed rather than an empty grey box. */}
      <>
        <LinearGradient
            colors={
              isDark
                ? [`hsl(${hue}, 28%, 22%)`, `hsl(${hue}, 22%, 13%)`]
                : [`hsl(${hue}, 52%, 88%)`, `hsl(${hue}, 38%, 76%)`]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.center} pointerEvents="none">
            <Txt
              style={{
                fontFamily: fonts.display,
                fontSize: 44,
                letterSpacing: -1,
                color: isDark ? `hsl(${hue}, 40%, 62%)` : `hsl(${hue}, 45%, 34%)`,
                opacity: 0.55,
              }}
            >
              {seed.trim().charAt(0).toUpperCase()}
            </Txt>
          </View>
        </>

      {showPhoto ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={260}
          accessible={!!accessibilityLabel}
          accessibilityLabel={accessibilityLabel}
          onError={() => setFailed(true)}
        />
      ) : null}

      {scrim ? (
        <LinearGradient
          colors={['transparent', 'rgba(12, 8, 6, 0.38)', 'rgba(12, 8, 6, 0.88)']}
          locations={[0.25, 0.62, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
