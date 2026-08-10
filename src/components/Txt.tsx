import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { useTheme } from '../theme/theme';
import { type as typeScale } from '../theme/tokens';

export type TxtVariant = keyof typeof typeScale;
type Tone = 'default' | 'muted' | 'faint' | 'accent' | 'onAccent' | 'inverse';

interface Props extends TextProps {
  variant?: TxtVariant;
  tone?: Tone;
  /** Escape hatch for one-off colours (e.g. text over a photo). */
  color?: string;
  uppercase?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Txt({
  variant = 'body',
  tone = 'default',
  color,
  uppercase,
  style,
  children,
  ...rest
}: Props) {
  const { c } = useTheme();

  const toneColor: Record<Tone, string> = {
    default: c.text,
    muted: c.textMuted,
    faint: c.textFaint,
    accent: c.accent,
    onAccent: c.onAccent,
    inverse: c.bg,
  };

  return (
    <Text
      {...rest}
      style={[
        typeScale[variant],
        { color: color ?? toneColor[tone] },
        uppercase && { textTransform: 'uppercase' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
