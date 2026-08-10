import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/theme';
import { fonts } from '../theme/tokens';
import { Txt } from './Txt';

/**
 * The wordmark. "2" carries the accent — it is the only decorative colour in
 * the header, which is what makes it read as a logo rather than a title.
 */
export function Logo({ size = 22 }: { size?: number }) {
  const { c } = useTheme();

  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="What2Eat"
      style={{ flexDirection: 'row', alignItems: 'baseline' }}
    >
      <Txt
        style={{
          fontFamily: fonts.display,
          fontSize: size,
          letterSpacing: -0.7,
          color: c.text,
        }}
      >
        What
      </Txt>
      <Txt
        style={{
          fontFamily: fonts.display,
          fontSize: size,
          letterSpacing: -0.7,
          color: c.accent,
        }}
      >
        2
      </Txt>
      <Txt
        style={{
          fontFamily: fonts.display,
          fontSize: size,
          letterSpacing: -0.7,
          color: c.text,
        }}
      >
        Eat
      </Txt>
    </View>
  );
}
