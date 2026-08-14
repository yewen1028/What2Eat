import { Coords, MealPeriod, OpenInterval, Place, WeeklyHours } from '../types';

/**
 * OpenStreetMap provider, via the Overpass API.
 *
 * The point of this provider is that it needs **no key and no billing**, so the
 * app's default state is real businesses at real coordinates rather than the
 * fictional sample neighbourhood. Every place here is one you can verify on any
 * map.
 *
 * What OSM does not have is the other half of the product: there are no ratings
 * and no review counts, and price is rarely tagged. Those fields are left empty
 * rather than filled with a plausible guess — inventing a rating for a business
 * that actually exists is the precise failure `providers/sample.ts` was written
 * to avoid, and it would be worse here because the name is real. Google Places
 * remains the better source when a key is available; see `places.ts` for the
 * order they are tried in.
 */

/** Public instances. The second is tried only if the first is unreachable. */
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/** Overpass is a shared free service; do not ask it for more than we show. */
const MAX_RESULTS = 80;

const AMENITIES = 'restaurant|cafe|fast_food|food_court';

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** The id prefix every OSM listing carries. Owned here, checked elsewhere. */
const OSM_ID_PREFIX = 'osm-';

/**
 * True for OpenStreetMap listings.
 *
 * These are real places, so they route and map like Google ones — but their ids
 * are OSM ids, not Google place ids, which matters anywhere a Google place id is
 * expected (`lib/embed.ts`). Like `isSamplePlace`, the id travels with the place
 * so a bookmark saved in an earlier session still answers correctly.
 */
export function isOsmPlace(place: Pick<Place, 'id'>): boolean {
  return place.id.startsWith(OSM_ID_PREFIX);
}

const DAY_INDEX: Record<string, number> = { su: 0, mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6 };
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * Constructs OSM `opening_hours` cannot be expressed as a plain weekly grid.
 *
 * Public holidays, seasonal ranges, week numbers and solar times all describe
 * days this app has no way to represent. A rule containing one is skipped
 * outright: saying nothing about Tuesday is honest, while flattening
 * "Mo-Fr 09:00-17:00; PH off" into "open every weekday" quietly asserts a
 * holiday opening the mapper explicitly denied.
 */
const UNSUPPORTED =
  /\bph\b|\bsh\b|week\s|easter|sunrise|sunset|dawn|dusk|\[|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/;

function parseDays(part: string): number[] {
  const tokens = part.replace(/\s+/g, '').split(',').filter(Boolean);
  const days: number[] = [];

  for (const token of tokens) {
    const range = token.match(/^(mo|tu|we|th|fr|sa|su)-(mo|tu|we|th|fr|sa|su)$/);
    if (range) {
      const from = DAY_INDEX[range[1]];
      const to = DAY_INDEX[range[2]];
      // OSM weeks run Mo..Su, so a range may wrap through Sunday (Sa-Su).
      for (let i = 0; i < 7; i++) {
        const day = (from + i) % 7;
        days.push(day);
        if (day === to) break;
      }
      continue;
    }
    const single = token.match(/^(mo|tu|we|th|fr|sa|su)$/);
    if (single) days.push(DAY_INDEX[single[1]]);
  }

  // No day prefix in OSM means "every day".
  return days.length > 0 ? [...new Set(days)] : ALL_DAYS;
}

function parseSlots(part: string): OpenInterval[] {
  const slots: OpenInterval[] = [];
  const re = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(part)) !== null) {
    const open = Number(m[1]) * 60 + Number(m[2]);
    let close = Number(m[3]) * 60 + Number(m[4]);
    // A close at or before the open is the next day: mamak 18:00-02:00.
    if (close <= open) close += 1440;
    slots.push({ open, close });
  }

  return slots;
}

/**
 * A usable subset of the OSM `opening_hours` grammar.
 *
 * The full specification is a small language with holidays, date ranges and
 * solar times; this handles the forms that actually cover Malaysian eateries
 * ("24/7", "Mo-Fr 08:00-17:00", "Mo-Su 11:00-15:00,18:00-23:00", "Su off").
 * Returns null when nothing could be parsed, which the caller reports as
 * "hours not published" rather than as "closed".
 */
export function parseOpeningHours(spec: string | undefined): WeeklyHours | null {
  const clean = spec?.trim().toLowerCase();
  if (!clean) return null;

  if (clean === '24/7') return Array.from({ length: 7 }, () => [{ open: 0, close: 1440 }]);

  const week: WeeklyHours = Array.from({ length: 7 }, () => []);
  let parsedAnything = false;

  for (const rule of clean.split(';')) {
    const r = rule.trim();
    if (!r || UNSUPPORTED.test(r)) continue;

    const firstTime = r.search(/\d{1,2}:\d{2}/);
    const dayPart = firstTime === -1 ? r.replace(/\b(off|closed)\b/g, '') : r.slice(0, firstTime);
    const days = parseDays(dayPart);

    if (firstTime === -1) {
      // A dayspec with no times is only meaningful as an explicit closure.
      if (/\b(off|closed)\b/.test(r)) {
        for (const day of days) week[day] = [];
        parsedAnything = true;
      }
      continue;
    }

    const slots = parseSlots(r.slice(firstTime));
    if (slots.length === 0) continue;

    for (const day of days) week[day].push(...slots);
    parsedAnything = true;
  }

  if (!parsedAnything) return null;

  for (let day = 0; day < 7; day++) {
    // Overlapping rules for one day can repeat a slot; the hours table would
    // print it twice.
    const seen = new Set<string>();
    week[day] = week[day]
      .filter((s) => {
        const key = `${s.open}-${s.close}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.open - b.open);
  }

  return week;
}

/**
 * Meal periods from OSM's `amenity` and `cuisine` tags.
 *
 * Same reasoning as the Google provider: every entry is a set, because a wrong
 * single period is worse than a broad one when fit is 18% of the rank. Mamak and
 * kopitiam are the cases that matter most in Malaysia and both run far outside
 * the usual lunch/dinner windows.
 */
const CUISINE_PERIODS: Record<string, MealPeriod[]> = {
  coffee_shop: ['coffee', 'breakfast', 'brunch'],
  kopitiam: ['breakfast', 'brunch', 'coffee'],
  cafe: ['coffee', 'breakfast', 'brunch'],
  tea: ['coffee'],
  bubble_tea: ['coffee'],
  dessert: ['coffee', 'late'],
  ice_cream: ['coffee', 'late'],
  bakery: ['breakfast', 'coffee'],
  sandwich: ['breakfast', 'lunch'],
  breakfast: ['breakfast', 'brunch'],
  mamak: ['breakfast', 'lunch', 'dinner', 'late'],
  indian: ['breakfast', 'lunch', 'dinner', 'late'],
  malaysian: ['breakfast', 'lunch', 'dinner'],
  nasi_lemak: ['breakfast', 'lunch'],
  noodle: ['breakfast', 'lunch', 'dinner'],
  chinese: ['lunch', 'dinner'],
  asian: ['lunch', 'dinner'],
  thai: ['lunch', 'dinner'],
  japanese: ['lunch', 'dinner'],
  korean: ['lunch', 'dinner'],
  indonesian: ['lunch', 'dinner'],
  italian: ['lunch', 'dinner'],
  pizza: ['lunch', 'dinner', 'late'],
  burger: ['lunch', 'dinner', 'late'],
  chicken: ['lunch', 'dinner', 'late'],
  seafood: ['dinner'],
  steak_house: ['dinner'],
  barbecue: ['dinner', 'late'],
  vegetarian: ['lunch', 'dinner'],
  vegan: ['lunch', 'dinner'],
};

const AMENITY_PERIODS: Record<string, MealPeriod[]> = {
  cafe: ['coffee', 'breakfast', 'brunch'],
  fast_food: ['lunch', 'dinner', 'late'],
  food_court: ['breakfast', 'lunch', 'dinner', 'late'],
  restaurant: ['lunch', 'dinner'],
};

/** OSM packs multiple values into one tag with semicolons. */
const splitTag = (value?: string): string[] =>
  (value ?? '')
    .toLowerCase()
    .split(';')
    .map((v) => v.trim())
    .filter(Boolean);

function toMealPeriods(tags: Record<string, string>): MealPeriod[] {
  const found = new Set<MealPeriod>();

  for (const cuisine of splitTag(tags.cuisine)) {
    for (const period of CUISINE_PERIODS[cuisine] ?? []) found.add(period);
  }

  if (found.size === 0) {
    for (const period of AMENITY_PERIODS[tags.amenity] ?? ['lunch', 'dinner']) found.add(period);
  }

  return [...found];
}

const humanise = (value: string): string =>
  value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const AMENITY_LABELS: Record<string, string> = {
  cafe: 'Cafe',
  fast_food: 'Fast food',
  food_court: 'Food court',
  restaurant: 'Restaurant',
};

function toAddress(tags: Record<string, string>): string {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const parts = [street, tags['addr:suburb'], tags['addr:city']].filter(Boolean);
  return parts.join(', ');
}

/** Exported so the mapping can be exercised against a saved Overpass response. */
export function mapElements(elements: OverpassElement[]): Place[] {
  return elements.map(toPlace).filter((p): p is Place => p !== null);
}

function toPlace(el: OverpassElement): Place | null {
  const tags = el.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat === undefined || lon === undefined) return null;

  const cuisines = splitTag(tags.cuisine);
  const hours = parseOpeningHours(tags.opening_hours);
  const diet = tags['diet:vegetarian'];

  return {
    id: `${OSM_ID_PREFIX}${el.type}-${el.id}`,
    // Straight from the map. Never rewritten, same rule as the Google provider.
    name,
    cuisine: cuisines[0] ? humanise(cuisines[0]) : (AMENITY_LABELS[tags.amenity] ?? 'Restaurant'),
    tags: cuisines.slice(1, 4).map(humanise),
    // OSM has no ratings. Zero means "unrated" throughout the app; it is never
    // rendered as a score, and the rating filter does not exclude it.
    rating: 0,
    reviewCount: 0,
    // Left undefined on purpose: OSM almost never tags price, and a plausible
    // "$$" against a real restaurant is a claim we have no basis for.
    priceLevel: undefined,
    coords: { lat, lng: lon },
    address: toAddress(tags),
    hours: hours ?? Array.from({ length: 7 }, () => []),
    hoursUnknown: hours === null,
    mealPeriods: toMealPeriods(tags),
    vegetarianFriendly:
      diet === 'yes' || diet === 'only' || cuisines.includes('vegetarian') || cuisines.includes('vegan')
        ? true
        : undefined,
  };
}

function buildQuery(origin: Coords, radiusMetres: number): string {
  const radius = Math.round(Math.min(radiusMetres, 10_000));
  const around = `around:${radius},${origin.lat},${origin.lng}`;

  // `["name"]` drops the unnamed pins OSM is full of — a restaurant we cannot
  // name is not something this app can suggest.
  return `[out:json][timeout:20];
(
  node["amenity"~"^(${AMENITIES})$"]["name"](${around});
  way["amenity"~"^(${AMENITIES})$"]["name"](${around});
);
out center ${MAX_RESULTS};`;
}

async function askOverpass(
  endpoint: string,
  query: string,
  signal?: AbortSignal,
): Promise<OverpassElement[]> {
  // GET rather than POST. Overpass accepts both, but POST is the one that gets
  // dropped by corporate proxies and captive networks, and the query is a few
  // hundred characters — nowhere near a URL length limit. A GET is also
  // cacheable, which the public instances appreciate.
  const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
    method: 'GET',
    signal,
  });

  if (!response.ok) {
    // 429 and 504 are Overpass load-shedding rather than a broken query, and
    // are worth saying plainly because they resolve on their own.
    const reason =
      response.status === 429 || response.status === 504
        ? 'OpenStreetMap is busy right now.'
        : `OpenStreetMap request failed (${response.status}).`;
    throw new Error(reason);
  }

  const json = (await response.json()) as { elements?: OverpassElement[] };
  return json.elements ?? [];
}

/**
 * Real restaurants around a point, no API key required.
 *
 * Falls through to the second Overpass mirror when the first is unreachable;
 * the public instances rate-limit and go down often enough that a single
 * endpoint would make the keyless path feel broken.
 */
export async function fetchOsmPlaces(
  origin: Coords,
  radiusMetres: number,
  signal?: AbortSignal,
): Promise<Place[]> {
  const query = buildQuery(origin, radiusMetres);

  let lastError: unknown;
  for (const endpoint of ENDPOINTS) {
    try {
      return mapElements(await askOverpass(endpoint, query, signal));
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenStreetMap is unreachable.');
}
