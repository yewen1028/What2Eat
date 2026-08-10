import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { FilterChip } from '../../src/components/FilterChip';
import { EmptyState, Notice, SCREEN_PADDING } from '../../src/components/Layout';
import { PlaceRow } from '../../src/components/PlaceRow';
import { RowSkeleton } from '../../src/components/Skeleton';
import { Touchable } from '../../src/components/Touchable';
import { Txt } from '../../src/components/Txt';
import { bayesianRating } from '../../src/lib/score';
import { Suggestion } from '../../src/lib/types';
import { useNearby } from '../../src/state/nearby';
import { useTheme } from '../../src/theme/theme';
import { icon, MIN_TAP, space } from '../../src/theme/tokens';

type Sort = 'best' | 'closest' | 'rating';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'best', label: 'Best match' },
  { key: 'closest', label: 'Closest' },
  { key: 'rating', label: 'Top rated' },
];

export default function NearbyScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sort, setSort] = useState<Sort>('best');

  const {
    status,
    loading,
    refreshing,
    refresh,
    suggestions,
    places,
    filters,
    setFilters,
    resetFilters,
    source,
    warning,
  } = useNearby();

  const sorted = useMemo(() => sortSuggestions(suggestions, sort), [suggestions, sort]);

  if (status !== 'ready') {
    return (
      <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top + space.xl }]}>
        <EmptyState
          iconName="location-outline"
          title="Location needed"
          body="Turn on location on the Now tab and this list fills with everything worth eating around you."
          action={<Button label="Go to Now" onPress={() => router.push('/')} />}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm, borderColor: c.border }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Txt variant="title" accessibilityRole="header">
              Nearby
            </Txt>
            <Txt variant="small" tone="muted" style={{ marginTop: 2 }}>
              {loading
                ? 'Ranking places around you…'
                : `${sorted.length} of ${places.length} places match`}
            </Txt>
          </View>

          <Touchable
            accessibilityRole="button"
            accessibilityLabel="All filters"
            onPress={() => router.push('/filters')}
            style={styles.iconButton}
          >
            <View style={[styles.disc, { backgroundColor: c.surfaceAlt }]}>
              <Ionicons name="options-outline" size={icon.md} color={c.text} />
            </View>
          </Touchable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {SORTS.map((s) => (
            <FilterChip
              key={s.key}
              label={s.label}
              selected={sort === s.key}
              accessibilityLabel={`Sort by ${s.label}`}
              onPress={() => setSort(s.key)}
            />
          ))}

          <View style={[styles.chipDivider, { backgroundColor: c.border }]} />

          <FilterChip
            label="Open now"
            iconName="time-outline"
            selected={filters.openOnly}
            onPress={() => setFilters({ ...filters, openOnly: !filters.openOnly })}
          />
          <FilterChip
            label="Under 10 min"
            iconName="walk-outline"
            selected={filters.maxWalkMinutes <= 10}
            accessibilityLabel="Under 10 minutes walk"
            onPress={() =>
              setFilters({ ...filters, maxWalkMinutes: filters.maxWalkMinutes <= 10 ? 20 : 10 })
            }
          />
          <FilterChip
            label="4.5+"
            iconName="star-outline"
            selected={filters.minRating >= 4.5}
            accessibilityLabel="Rated 4.5 and above"
            onPress={() => setFilters({ ...filters, minRating: filters.minRating >= 4.5 ? 4 : 4.5 })}
          />
          <FilterChip
            label="Vegetarian"
            iconName="leaf-outline"
            selected={filters.vegetarianOnly}
            accessibilityLabel="Vegetarian friendly only"
            onPress={() => setFilters({ ...filters, vegetarianOnly: !filters.vegetarianOnly })}
          />
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((i) => (
            <RowSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(s) => s.place.id}
          contentContainerStyle={[styles.list, { paddingBottom: space['3xl'] }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.textMuted} />
          }
          renderItem={({ item, index }) => (
            <PlaceRow
              suggestion={item}
              rank={sort === 'best' ? index + 1 : undefined}
              showDivider={index < sorted.length - 1}
            />
          )}
          ListHeaderComponent={
            source === 'sample' && warning ? (
              <View style={{ paddingTop: space.lg }}>
                <Notice text={warning} tone="caution" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              iconName="funnel-outline"
              title="No matches"
              body="Nothing here clears every filter at once. Loosening the walking distance usually opens things up fastest."
              action={<Button label="Reset filters" onPress={resetFilters} />}
            />
          }
        />
      )}
    </View>
  );
}

function sortSuggestions(list: Suggestion[], sort: Sort): Suggestion[] {
  const copy = [...list];
  if (sort === 'closest') return copy.sort((a, b) => a.distance - b.distance);
  if (sort === 'rating') {
    // Bayesian, so a 5.0 from a handful of reviews cannot top the list.
    return copy.sort(
      (a, b) =>
        bayesianRating(b.place.rating, b.place.reviewCount) -
        bayesianRating(a.place.rating, a.place.reviewCount),
    );
  }
  return copy;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconButton: {
    width: MIN_TAP,
    height: MIN_TAP,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  disc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chipRow: { gap: space.sm, paddingTop: space.lg, paddingRight: SCREEN_PADDING, alignItems: 'center' },
  chipDivider: { width: StyleSheet.hairlineWidth, height: 24, marginHorizontal: space.xs },
  list: { paddingHorizontal: SCREEN_PADDING },
});
