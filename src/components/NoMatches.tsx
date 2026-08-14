import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { useNearby } from '../state/nearby';
import { space } from '../theme/tokens';
import { Button } from './Button';
import { EmptyState } from './Layout';

const places = (n: number) => `${n} ${n === 1 ? 'place' : 'places'}`;

/**
 * What the app says when every place has been filtered away.
 *
 * The old copy guessed: "widen the walk or drop the minimum rating". The app
 * does not have to guess — `diagnoseFilters` relaxes each filter in turn and
 * counts, so this can name the one that is actually responsible and move it in
 * a single tap. That turns the only real dead end in the app into a decision.
 *
 * Two different empty states hide behind one screen and they need different
 * answers: filters tighter than the neighbourhood (relax one), and nothing
 * loaded at all (try again). `diagnosis` tells them apart, so neither gets the
 * advice meant for the other.
 */
export function NoMatches() {
  const router = useRouter();
  const { diagnosis, setFilters, filtersChanged, resetFilters, places: loaded, refresh } =
    useNearby();

  if (loaded.length === 0) {
    return (
      <EmptyState
        iconName="compass-outline"
        title="Nothing loaded nearby"
        body="No restaurants came back for this spot. That is usually a patchy connection rather than an empty neighbourhood."
        action={<Button label="Try again" iconName="refresh" onPress={refresh} />}
      />
    );
  }

  if (diagnosis) {
    return (
      <EmptyState
        iconName="funnel-outline"
        title="Nothing matches"
        body={`${places(loaded.length)} nearby, but none clear every filter at once. ${diagnosis.action} and ${places(diagnosis.gain)} come back.`}
        action={
          <View style={{ gap: space.md, alignItems: 'center' }}>
            <Button
              label={diagnosis.action}
              iconName="funnel-outline"
              onPress={() => setFilters(diagnosis.relaxed)}
              accessibilityHint={`Shows ${places(diagnosis.gain)}`}
            />
            <Button label="All filters" variant="ghost" onPress={() => router.push('/filters')} />
          </View>
        }
      />
    );
  }

  // No single relaxation helps, so this deliberately does not name a culprit it
  // has not identified — it says what it knows and hands over the controls.
  return (
    <EmptyState
      iconName="funnel-outline"
      title="Nothing matches"
      body={`${places(loaded.length)} nearby, but none of them clear the filters as they stand, and no single change opens it up.`}
      action={
        <View style={{ gap: space.md, alignItems: 'center' }}>
          <Button label="Reset filters" onPress={resetFilters} disabled={!filtersChanged} />
          <Button label="All filters" variant="ghost" onPress={() => router.push('/filters')} />
        </View>
      }
    />
  );
}
