import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../src/components/Button';
import { FilterChip } from '../src/components/FilterChip';
import { SCREEN_PADDING, SectionHeader } from '../src/components/Layout';
import { Toggle } from '../src/components/Toggle';
import { Touchable } from '../src/components/Touchable';
import { Txt } from '../src/components/Txt';
import { useNearby } from '../src/state/nearby';
import { useTheme } from '../src/theme/theme';
import { icon, MIN_TAP, radius, space } from '../src/theme/tokens';

const WALK_OPTIONS = [5, 10, 20, 40];
const RATING_OPTIONS = [0, 4, 4.3, 4.5];
const PRICE_OPTIONS: { level: 1 | 2 | 3 | 4; label: string; hint: string }[] = [
  { level: 1, label: '$', hint: 'Cheap eats' },
  { level: 2, label: '$$', hint: 'Moderate' },
  { level: 3, label: '$$$', hint: 'Expensive' },
  { level: 4, label: '$$$$', hint: 'Very expensive' },
];

export default function FiltersScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { filters, setFilters, resetFilters, filtersChanged, suggestions, places } = useNearby();

  const togglePrice = (level: number) => {
    const next = filters.priceLevels.includes(level)
      ? filters.priceLevels.filter((l) => l !== level)
      : [...filters.priceLevels, level];
    // Never let the user filter everything out by accident.
    setFilters({ ...filters, priceLevels: next.length === 0 ? [level] : next });
  };


  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: space.lg, borderColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Txt variant="title" accessibilityRole="header">
            Filters
          </Txt>
          <Txt variant="small" tone="muted" style={{ marginTop: 2 }}>
            {suggestions.length} of {places.length} places match
          </Txt>
        </View>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          onPress={() => router.back()}
          style={styles.closeTap}
        >
          <View style={[styles.disc, { backgroundColor: c.surfaceAlt }]}>
            <Ionicons name="close" size={icon.md} color={c.text} />
          </View>
        </Touchable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: space['4xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <Row
          title="Open right now"
          subtitle="Hides kitchens that have already closed for the night."
        >
          <Toggle
            value={filters.openOnly}
            onChange={(v) => setFilters({ ...filters, openOnly: v })}
            accessibilityLabel="Only show places that are open now"
          />
        </Row>

        <Row
          title="Vegetarian friendly"
          subtitle="Only places with a proper vegetarian offering."
        >
          <Toggle
            value={filters.vegetarianOnly}
            onChange={(v) => setFilters({ ...filters, vegetarianOnly: v })}
            accessibilityLabel="Only show vegetarian friendly places"
          />
        </Row>

        <View style={styles.section}>
          <SectionHeader title="Walking distance" />
          <View style={styles.chipWrap}>
            {WALK_OPTIONS.map((mins) => (
              <FilterChip
                key={mins}
                label={`${mins} min`}
                selected={filters.maxWalkMinutes === mins}
                accessibilityLabel={`Up to ${mins} minutes walk`}
                onPress={() => setFilters({ ...filters, maxWalkMinutes: mins })}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Minimum rating" />
          <View style={styles.chipWrap}>
            {RATING_OPTIONS.map((r) => (
              <FilterChip
                key={r}
                label={r === 0 ? 'Any' : `${r.toFixed(1)}+`}
                selected={filters.minRating === r}
                accessibilityLabel={r === 0 ? 'Any rating' : `Rated ${r.toFixed(1)} and above`}
                onPress={() => setFilters({ ...filters, minRating: r })}
              />
            ))}
          </View>
          <Txt variant="small" tone="muted" style={{ marginTop: space.md }}>
            Ratings are weighted by review count, so a 5.0 from nine people will not outrank a 4.6
            from two thousand.
          </Txt>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Price" />
          <View style={styles.chipWrap}>
            {PRICE_OPTIONS.map((p) => (
              <FilterChip
                key={p.level}
                label={p.label}
                selected={filters.priceLevels.includes(p.level)}
                accessibilityLabel={`${p.hint}, ${p.label}`}
                onPress={() => togglePrice(p.level)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: c.bg,
            borderColor: c.border,
            paddingBottom: Math.max(insets.bottom, space.lg),
          },
        ]}
      >
        <Button
          label="Reset"
          variant="secondary"
          disabled={!filtersChanged}
          onPress={resetFilters}
          accessibilityHint="Returns to the defaults set in your profile"
          style={{ marginRight: space.md }}
        />
        <Button label="Show results" onPress={() => router.back()} fullWidth />
      </View>
    </View>
  );
}

function Row({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.switchRow, { borderColor: c.border }]}>
      <View style={{ flex: 1, marginRight: space.lg }}>
        <Txt variant="bodyStrong">{title}</Txt>
        <Txt variant="small" tone="muted" style={{ marginTop: 2 }}>
          {subtitle}
        </Txt>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeTap: {
    width: MIN_TAP,
    height: MIN_TAP,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  disc: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: SCREEN_PADDING, paddingTop: space.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  section: { marginTop: space['2xl'] },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
