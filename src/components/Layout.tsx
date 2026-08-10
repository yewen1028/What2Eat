import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme';
import { icon, radius, space } from '../theme/tokens';
import { Txt } from './Txt';

export const SCREEN_PADDING = space.xl;

/** Small caps label with a rule, used to open every section. */
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Txt variant="label" tone="faint" uppercase accessibilityRole="header">
        {title}
      </Txt>
      <View style={[styles.rule, { backgroundColor: c.border }]} />
      {action}
    </View>
  );
}

interface EmptyStateProps {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: React.ReactNode;
}

export function EmptyState({ iconName, title, body, action }: EmptyStateProps) {
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.surfaceAlt }]}>
        <Ionicons name={iconName} size={icon.lg} color={c.textMuted} />
      </View>
      <Txt variant="heading" style={{ marginTop: space.lg, textAlign: 'center' }}>
        {title}
      </Txt>
      <Txt variant="body" tone="muted" style={styles.emptyBody}>
        {body}
      </Txt>
      {action ? <View style={{ marginTop: space.xl }}>{action}</View> : null}
    </View>
  );
}

/** Non-blocking inline notice (fallback data, provider errors). */
export function Notice({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'caution' }) {
  const { c } = useTheme();
  const bg = tone === 'caution' ? c.cautionSoft : c.surfaceAlt;
  const fg = tone === 'caution' ? c.caution : c.textMuted;

  return (
    <View style={[styles.notice, { backgroundColor: bg }]} accessibilityRole="alert">
      <Ionicons
        name={tone === 'caution' ? 'alert-circle-outline' : 'information-circle-outline'}
        size={icon.sm}
        color={fg}
        style={{ marginTop: 2 }}
      />
      <Txt variant="small" color={fg} style={{ flex: 1, marginLeft: space.sm }}>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.md,
  },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  empty: { alignItems: 'center', paddingVertical: space['3xl'], paddingHorizontal: space.lg },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBody: {
    marginTop: space.sm,
    textAlign: 'center',
    maxWidth: 320,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: space.md,
    borderRadius: radius.md,
  },
});
