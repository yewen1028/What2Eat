import { distanceMetres, formatDistance, walkMinutes } from './geo';
import { formatDuration, MEAL_PERIOD_LABELS, mealPeriodFor, openStateFor } from './time';
import { Coords, Filters, MealPeriod, Place, Suggestion } from './types';


/**
 * Ranking is the whole product: the user should not have to open ten places to
 * find the one worth walking to. Four signals, weighted, plus a hard gate on
 * the filters.
 *
 *   quality   0.46   Bayesian rating — a 5.0 from nine people is not a 5.0
 *   proximity 0.24   decays smoothly; nothing is "too far" until it is
 *   fit       0.18   does this place actually serve at this hour
 *   timing    0.12   open, and not about to throw you out
 */
const WEIGHTS = { quality: 0.46, proximity: 0.24, fit: 0.18, timing: 0.12 };

/** Prior for the Bayesian average: 4.0 stars with the weight of 80 reviews. */
const PRIOR_RATING = 4.0;
const PRIOR_WEIGHT = 80;

/** Distance at which the proximity score falls to ~0.37. */
const PROXIMITY_DECAY_M = 900;

export function bayesianRating(rating: number, reviewCount: number): number {
  const v = Math.max(0, reviewCount);
  return (v * rating + PRIOR_WEIGHT * PRIOR_RATING) / (v + PRIOR_WEIGHT);
}

/**
 * Whether this place carries a real rating at all.
 *
 * OpenStreetMap publishes none, so its listings arrive as 0/0. That is "we do
 * not know", not "nobody liked it", and the difference decides whether a real
 * restaurant is shown a fabricated score, hidden by a rating filter, or ranked
 * as though it were terrible.
 */
export function isRated(rating: number): boolean {
  return rating > 0;
}

/**
 * Screen-reader phrasing for a rating. Never says "rated 0.0", which is what
 * `toFixed` produces for an unrated place and reads as a damning verdict on a
 * real business.
 */
export function ratingLabel(rating: number): string {
  return isRated(rating) ? `rated ${rating.toFixed(1)}` : 'no rating published';
}

function qualityScore(place: Place): number {
  // Map the useful band (3.5 → 5.0) onto 0 → 1; below 3.5 barely registers.
  const adjusted = bayesianRating(place.rating, place.reviewCount);
  return clamp01((adjusted - 3.5) / 1.5);
}

function proximityScore(metres: number): number {
  return Math.exp(-metres / PROXIMITY_DECAY_M);
}

function fitScore(place: Place, period: MealPeriod): number {
  if (place.mealPeriods.includes(period)) return 1;
  // Adjacent periods are a partial match — brunch spots still work at lunch.
  const adjacent: Record<MealPeriod, MealPeriod[]> = {
    breakfast: ['brunch', 'coffee'],
    brunch: ['breakfast', 'lunch', 'coffee'],
    lunch: ['brunch', 'dinner'],
    coffee: ['brunch', 'breakfast'],
    dinner: ['lunch', 'late'],
    late: ['dinner'],
  };
  return adjacent[period].some((p) => place.mealPeriods.includes(p)) ? 0.45 : 0;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/**
 * @param period Which meal to rank for. Defaults to whatever the clock says;
 *   pass it explicitly when the user is browsing a different sitting (e.g.
 *   checking supper spots in the afternoon). Open/closed state always reflects
 *   real time regardless.
 */
export function buildSuggestion(
  place: Place,
  origin: Coords,
  at: Date,
  period: MealPeriod = mealPeriodFor(at),
  /**
   * Whether right-now opening state should count towards the score. False when
   * the user is browsing a sitting other than the current one: a kopitiam that
   * shuts at 15:00 is the *right* answer for breakfast, and scoring it zero at
   * 18:00 would bury it under whatever happens to be open. Its weight moves to
   * meal fit instead, and the pins still show real open/closed state.
   */
  scoreTiming = true,
): Suggestion {
  const distance = distanceMetres(origin, place.coords);
  const walk = walkMinutes(distance);
  const open = openStateFor(place.hours, at, place.utcOffsetMinutes);

  const quality = qualityScore(place);
  const proximity = proximityScore(distance);
  const fit = fitScore(place, period);

  let timing = 0;
  if (open.isOpen) {
    // Open, but nudged down if it closes before you could reasonably finish.
    const runway = open.closingInMinutes ?? 0;
    timing = runway >= walk + 60 ? 1 : clamp01((runway - walk) / 60);
  }

  /**
   * A place whose hours nobody has recorded cannot be scored on them. Leaving
   * it at timing 0 would rank every untagged OpenStreetMap listing below
   * anything with hours, on the strength of a fact we do not have. The weight
   * moves to meal fit, exactly as it does when browsing another sitting.
   */
  const timingKnown = scoreTiming && !place.hoursUnknown;

  const fitWeight = timingKnown ? WEIGHTS.fit : WEIGHTS.fit + WEIGHTS.timing;
  const score =
    WEIGHTS.quality * quality +
    WEIGHTS.proximity * proximity +
    fitWeight * fit +
    (timingKnown ? WEIGHTS.timing * timing : 0);

  const adjusted = bayesianRating(place.rating, place.reviewCount);
  // "supper", not the internal key "late".
  const periodLabel = MEAL_PERIOD_LABELS[period].toLowerCase();

  return {
    place,
    distance,
    walkMinutes: walk,
    isOpen: open.isOpen,
    hoursUnknown: place.hoursUnknown ?? false,
    closingInMinutes: open.closingInMinutes,
    opensInMinutes: open.opensInMinutes,
    score,
    breakdown: {
      quality: {
        value: quality,
        weight: WEIGHTS.quality,
        weighted: WEIGHTS.quality * quality,
        detail: isRated(place.rating)
          ? `${place.rating.toFixed(1)} from ${formatCount(place.reviewCount)} reviews, weighted to ${adjusted.toFixed(2)}`
          : 'No rating published, so this scores as an average place',
      },
      proximity: {
        value: proximity,
        weight: WEIGHTS.proximity,
        weighted: WEIGHTS.proximity * proximity,
        detail: `${formatDistance(distance)} from you · about ${walk} min on foot`,
      },
      fit: {
        value: fit,
        weight: fitWeight,
        weighted: fitWeight * fit,
        detail:
          fit === 1
            ? `Serves ${periodLabel}, which is what you want now`
            : fit > 0
              ? `Not primarily a ${periodLabel} spot, but close enough`
              : `Does not usually serve ${periodLabel}`,
      },
      timing: {
        value: timingKnown ? timing : 0,
        weight: timingKnown ? WEIGHTS.timing : 0,
        weighted: timingKnown ? WEIGHTS.timing * timing : 0,
        detail: place.hoursUnknown
          ? 'Not scored, because nobody has published this place’s opening hours'
          : !scoreTiming
          ? `Not scored, because you are browsing ${periodLabel} rather than now`
          : open.isOpen
          ? open.closingInMinutes !== null && open.closingInMinutes < walk + 60
            ? `Open, but closing in ${formatDuration(open.closingInMinutes)}`
            : 'Open with time to spare'
          : open.opensInMinutes !== null
            ? `Closed. Opens in ${formatDuration(open.opensInMinutes)}`
            : 'Closed',
      },
    },
    reasons: buildReasons(place, { walk, quality, proximity, fit, open: open.isOpen }),
  };
}

/** Weight labels for the ranking breakdown UI. */
export const SCORE_WEIGHTS = WEIGHTS;

function buildReasons(
  place: Place,
  ctx: { walk: number; quality: number; proximity: number; fit: number; open: boolean },
): string[] {
  const reasons: string[] = [];

  if (place.rating >= 4.6 && place.reviewCount >= 200) {
    reasons.push(`${place.rating.toFixed(1)} across ${formatCount(place.reviewCount)} reviews`);
  } else if (ctx.quality > 0.6) {
    reasons.push(`Rated ${place.rating.toFixed(1)}`);
  }

  if (ctx.walk <= 5) reasons.push(`${ctx.walk} min on foot`);
  else if (ctx.walk <= 12) reasons.push(`${ctx.walk} min walk`);

  if (ctx.fit === 1) reasons.push('Right for this hour');
  if (place.typicalWait !== undefined && place.typicalWait <= 5) reasons.push('Rarely a wait');

  return reasons.slice(0, 3);
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

/**
 * Hard gate applied before the sort.
 *
 * Unknown is not the same as failing. A place with no published hours, no
 * rating or no price band is excluded by *none* of those filters, because the
 * user asked to rule out places that are known to be shut, poorly rated or too
 * expensive — not every place the map is quiet about. Treating unknown as a
 * failure emptied the whole list on OpenStreetMap data, where most listings
 * lack all three.
 */
export function passesFilters(s: Suggestion, f: Filters): boolean {
  if (f.openOnly && !s.isOpen && !s.place.hoursUnknown) return false;
  if (s.walkMinutes > f.maxWalkMinutes) return false;
  if (isRated(s.place.rating) && s.place.rating < f.minRating) return false;
  if (s.place.priceLevel !== undefined && !f.priceLevels.includes(s.place.priceLevel)) return false;
  if (f.vegetarianOnly && !s.place.vegetarianFriendly) return false;
  return true;
}

export function rank(
  places: Place[],
  origin: Coords,
  at: Date,
  filters: Filters,
  period?: MealPeriod,
  scoreTiming = true,
): Suggestion[] {
  return places
    .map((p) => buildSuggestion(p, origin, at, period, scoreTiming))
    .filter((s) => passesFilters(s, filters))
    .sort((a, b) => b.score - a.score);
}

/** Human summary of why the top pick won, for the hero card. */
export function headlineReason(s: Suggestion): string {
  if (s.closingInMinutes !== null && s.closingInMinutes <= 45) {
    return `Closing in ${formatDuration(s.closingInMinutes)}, go now`;
  }
  return s.reasons[0] ?? 'A solid call right now';
}
