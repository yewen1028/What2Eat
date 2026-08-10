import { distanceMetres, walkMinutes } from './geo';
import { formatDuration, mealPeriodFor, openStateFor } from './time';
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

export function buildSuggestion(place: Place, origin: Coords, at: Date): Suggestion {
  const distance = distanceMetres(origin, place.coords);
  const walk = walkMinutes(distance);
  const period = mealPeriodFor(at);
  const open = openStateFor(place.hours, at);

  const quality = qualityScore(place);
  const proximity = proximityScore(distance);
  const fit = fitScore(place, period);

  let timing = 0;
  if (open.isOpen) {
    // Open, but nudged down if it closes before you could reasonably finish.
    const runway = open.closingInMinutes ?? 0;
    timing = runway >= walk + 60 ? 1 : clamp01((runway - walk) / 60);
  }

  const score =
    WEIGHTS.quality * quality +
    WEIGHTS.proximity * proximity +
    WEIGHTS.fit * fit +
    WEIGHTS.timing * timing;

  return {
    place,
    distance,
    walkMinutes: walk,
    isOpen: open.isOpen,
    closingInMinutes: open.closingInMinutes,
    opensInMinutes: open.opensInMinutes,
    score,
    reasons: buildReasons(place, { walk, quality, proximity, fit, open: open.isOpen }),
  };
}

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

export function passesFilters(s: Suggestion, f: Filters): boolean {
  if (f.openOnly && !s.isOpen) return false;
  if (s.walkMinutes > f.maxWalkMinutes) return false;
  if (s.place.rating < f.minRating) return false;
  if (!f.priceLevels.includes(s.place.priceLevel)) return false;
  if (f.vegetarianOnly && !s.place.vegetarianFriendly) return false;
  return true;
}

export function rank(places: Place[], origin: Coords, at: Date, filters: Filters): Suggestion[] {
  return places
    .map((p) => buildSuggestion(p, origin, at))
    .filter((s) => passesFilters(s, filters))
    .sort((a, b) => b.score - a.score);
}

/** Human summary of why the top pick won, for the hero card. */
export function headlineReason(s: Suggestion): string {
  if (s.closingInMinutes !== null && s.closingInMinutes <= 45) {
    return `Closing in ${formatDuration(s.closingInMinutes)} — go now`;
  }
  return s.reasons[0] ?? 'A solid call right now';
}
