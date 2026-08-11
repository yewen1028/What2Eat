import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OpenBadge, PriceLevel, Rating } from '../../src/components/Badges';
import { Button } from '../../src/components/Button';
import { EmptyState, SCREEN_PADDING } from '../../src/components/Layout';
import { PlaceImage } from '../../src/components/PlaceImage';
import { PlaceRow } from '../../src/components/PlaceRow';
import { SaveButton } from '../../src/components/SaveButton';
import { Touchable } from '../../src/components/Touchable';
import { Txt } from '../../src/components/Txt';
import { buildSuggestion } from '../../src/lib/score';
import { openStateFor } from '../../src/lib/time';
import { Place } from '../../src/lib/types';
import { useNearby } from '../../src/state/nearby';
import { useSaved } from '../../src/state/saved';
import { useTheme } from '../../src/theme/theme';
import { radius, space } from '../../src/theme/tokens';

export default function SavedScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, hydrated } = useSaved();
  const { origin, now } = useNearby();

  // Saved places stay useful without a fix on the user's position; distance is
  // simply omitted rather than guessed.
  const rows = useMemo(
    () => (origin ? items.map((p) => buildSuggestion(p, origin, now)) : null),
    [items, origin, now],
  );

  if (hydrated && items.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top + space.xl }]}>
        <Header />
        <EmptyState
          iconName="bookmark-outline"
          title="Nothing saved yet"
          body="Tap the bookmark on any place to keep it here — handy for the spots you keep meaning to try."
          action={<Button label="Find something now" onPress={() => router.push('/')} />}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top + space.xl }]}>
      <Header count={items.length} />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, { paddingBottom: space['3xl'] }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) =>
          rows ? (
            <PlaceRow suggestion={rows[index]} showDivider={index < items.length - 1} />
          ) : (
            <SavedRowWithoutLocation place={item} showDivider={index < items.length - 1} now={now} />
          )
        }
      />
    </View>
  );
}

function Header({ count }: { count?: number }) {
  return (
    <View style={styles.header}>
      <Txt variant="title" accessibilityRole="header">
        Saved
      </Txt>
      {count !== undefined ? (
        <Txt variant="small" tone="muted" style={{ marginTop: 2 }}>
          {count} {count === 1 ? 'place' : 'places'}
        </Txt>
      ) : null}
    </View>
  );
}

function SavedRowWithoutLocation({
  place,
  showDivider,
  now,
}: {
  place: Place;
  showDivider: boolean;
  now: Date;
}) {
  const { c } = useTheme();
  const router = useRouter();
  const open = openStateFor(place.hours, now);

  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${place.cuisine}, rated ${place.rating.toFixed(1)}`}
      onPress={() => router.push(`/place/${place.id}`)}
      scaleTo={0.99}
      style={[
        styles.plainRow,
        showDivider && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
      ]}
    >
      <PlaceImage uri={place.photo} seed={place.name} style={styles.thumb} />
      <View style={styles.plainBody}>
        <Txt variant="heading" numberOfLines={1}>
          {place.name}
        </Txt>
        <Txt variant="small" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
          {place.cuisine} · {place.address}
        </Txt>
        <View style={styles.metaRow}>
          <Rating rating={place.rating} reviewCount={place.reviewCount} compact />
          <View style={{ width: space.md }} />
          <PriceLevel level={place.priceLevel} priceText={place.priceText} />
        </View>
        <View style={{ marginTop: 6 }}>
          <OpenBadge suggestion={open} />
        </View>
      </View>
      <SaveButton place={place} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: SCREEN_PADDING, paddingBottom: space.sm },
  list: { paddingHorizontal: SCREEN_PADDING },
  plainRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.lg },
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  plainBody: { flex: 1, marginLeft: space.lg, marginRight: space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
});
