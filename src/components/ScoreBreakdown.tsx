import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SCORE_WEIGHTS } from '../lib/score';
import { ScoreComponent, Suggestion } from '../lib/types';
import { useTheme } from '../theme/theme';
import { fonts, radius, space } from '../theme/tokens';
import { Txt } from './Txt';

const ROWS: { key: keyof Suggestion['breakdown']; label: string; weight: number }[] = [
  { key: 'quality', label: 'Rating quality', weight: SCORE_WEIGHTS.quality },
  { key: 'proximity', label: 'Distance from you', weight: SCORE_WEIGHTS.proximity },
  { key: 'fit', label: 'Right for this hour', weight: SCORE_WEIGHTS.fit },
  { key: 'timing', label: 'Still open', weight: SCORE_WEIGHTS.timing },
];

/**
 * Shows exactly why a place ranked where it did, against the user's current
 * position and the current time. Every number here is the same one the sort
 * used — nothing is recomputed for display.
 */
export function ScoreBreakdown({ suggestion }: { suggestion: Suggestion }) {
  const { c } = useTheme();

  return (
    <View>
      <View style={[styles.total, { backgroundColor: c.surfaceAlt }]}>
        <View style={{ flex: 1 }}>
          <Txt variant="label" tone="faint" uppercase>
            Match score
          </Txt>
          <Txt variant="small" tone="muted" style={{ marginTop: 2 }}>
            Out of 100, for where you are standing right now
          </Txt>
        </View>
        <Txt style={{ fontFamily: fonts.display, fontSize: 34, color: c.text, letterSpacing: -1 }}>
          {Math.round(suggestion.score * 100)}
        </Txt>
      </View>

      {ROWS.map(({ key, label, weight }) => (
        <Row
          key={key}
          label={label}
          weight={weight}
          component={suggestion.breakdown[key]}
        />
      ))}
    </View>
  );
}

function Row({
  label,
  weight,
  component,
}: {
  label: string;
  weight: number;
  component: ScoreComponent;
}) {
  const { c } = useTheme();
  const pct = Math.round(component.value * 100);

  return (
    <View
      style={styles.row}
      accessibilityLabel={`${label}: ${pct} out of 100, worth ${Math.round(weight * 100)} percent of the score. ${component.detail}`}
    >
      <View style={styles.rowHead}>
        <Txt variant="smallStrong" style={{ flex: 1 }}>
          {label}
        </Txt>
        <Txt variant="label" tone="faint">
          {Math.round(weight * 100)}% weight
        </Txt>
      </View>

      {/* The bar is paired with the number so meaning never rests on width alone. */}
      <View style={styles.barRow}>
        <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
          <View
            style={[
              styles.fill,
              { width: `${Math.max(2, pct)}%`, backgroundColor: pct >= 50 ? c.accent : c.borderStrong },
            ]}
          />
        </View>
        <Txt variant="smallStrong" tone="muted" style={styles.pct}>
          {pct}
        </Txt>
      </View>

      <Txt variant="small" tone="muted">
        {component.detail}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.lg,
    borderRadius: radius.md,
    marginBottom: space.xl,
  },
  row: { marginBottom: space.lg },
  rowHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  pct: { width: 34, textAlign: 'right' },
});
