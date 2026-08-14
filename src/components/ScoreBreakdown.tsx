import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ScoreComponent, Suggestion } from '../lib/types';
import { useTheme } from '../theme/theme';
import { fonts, space } from '../theme/tokens';
import { Txt } from './Txt';

/**
 * Weights are read off each component, not from `SCORE_WEIGHTS`. The two differ
 * whenever timing could not be scored — unknown hours, or browsing another
 * sitting — and the constant would then describe a sort that never happened.
 */
const ROWS: { key: keyof Suggestion['breakdown']; label: string }[] = [
  { key: 'quality', label: 'Rating quality' },
  { key: 'proximity', label: 'Distance from you' },
  { key: 'fit', label: 'Right for this hour' },
  { key: 'timing', label: 'Still open' },
];

/**
 * Why a place ranked where it did, against the user's current position and the
 * current time. Every number is the one the sort used; nothing is recomputed.
 *
 * Presented as a ledger rather than progress bars. Filled meter tracks are
 * dashboard furniture: they take a lot of ink to say what a two-digit number
 * says exactly, and four of them stacked reads as a settings screen. The score
 * carries the weight typographically instead.
 */
export function ScoreBreakdown({ suggestion }: { suggestion: Suggestion }) {
  const { c } = useTheme();

  return (
    <View>
      <View style={styles.total}>
        <Txt
          style={{
            fontFamily: fonts.display,
            fontSize: 64,
            lineHeight: 62,
            letterSpacing: -3,
            color: c.accent,
          }}
        >
          {Math.round(suggestion.score * 100)}
        </Txt>
        <View style={styles.totalMeta}>
          <Txt variant="bodyStrong">Match score</Txt>
          <Txt variant="small" tone="muted" style={{ marginTop: 2 }}>
            Out of 100, for where you are standing right now
          </Txt>
        </View>
      </View>

      <View style={[styles.rule, { backgroundColor: c.text }]} />

      {ROWS.map(({ key, label }, i) => (
        <Row
          key={key}
          label={label}
          component={suggestion.breakdown[key]}
          last={i === ROWS.length - 1}
        />
      ))}
    </View>
  );
}

function Row({
  label,
  component,
  last,
}: {
  label: string;
  component: ScoreComponent;
  last: boolean;
}) {
  const { c } = useTheme();
  const pct = Math.round(component.value * 100);
  const weight = component.weight;

  return (
    <View
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border }]}
      accessibilityLabel={`${label}: ${pct} out of 100, worth ${Math.round(weight * 100)} percent of the score. ${component.detail}`}
    >
      <View style={styles.rowHead}>
        <Txt variant="bodyStrong" style={{ flex: 1 }}>
          {label}
        </Txt>
        {/* Tabular figures keep the column edge straight down the list. */}
        <Txt
          style={{
            fontFamily: fonts.display,
            fontSize: 22,
            letterSpacing: -0.6,
            color: pct >= 50 ? c.text : c.textFaint,
            fontVariant: ['tabular-nums'],
          }}
        >
          {pct}
        </Txt>
      </View>

      <View style={styles.rowFoot}>
        <Txt variant="small" tone="muted" style={{ flex: 1 }}>
          {component.detail}
        </Txt>
        <Txt variant="label" tone="faint" style={{ marginLeft: space.md }}>
          {Math.round(weight * 100)}%
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  total: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  totalMeta: { flex: 1, marginLeft: space.lg },
  rule: { height: 1.5, marginBottom: space.xs },
  row: { paddingVertical: space.md },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  rowFoot: { flexDirection: 'row', alignItems: 'flex-end' },
});
