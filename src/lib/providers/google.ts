import { Coords, MealPeriod, Place, WeeklyHours } from '../types';

/**
 * Google Places API (New) provider.
 *
 * Optional: without a key the app falls back to OpenStreetMap (`providers/osm.ts`),
 * which has the names but none of the ratings, prices or photos. Put one in
 * `app.json` under `expo.extra.googlePlacesApiKey`, or set
 * `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`. Restrict the key to the Places API and
 * to your bundle identifiers before shipping.
 */

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.shortFormattedAddress',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  // Actual money, in local currency — far more useful in Malaysia than a row
  // of dollar signs.
  'places.priceRange',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.regularOpeningHours',
  'places.utcOffsetMinutes',
  'places.photos',
  'places.servesVegetarianFood',
  'places.businessStatus',
].join(',');

interface GooglePoint {
  day: number;
  hour: number;
  minute: number;
}

interface GoogleMoney {
  currencyCode?: string;
  units?: string;
}

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  shortFormattedAddress?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  priceRange?: { startPrice?: GoogleMoney; endPrice?: GoogleMoney };
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  regularOpeningHours?: { periods?: { open?: GooglePoint; close?: GooglePoint }[] };
  utcOffsetMinutes?: number;
  photos?: { name: string }[];
  servesVegetarianFood?: boolean;
  businessStatus?: string;
}

const PRICE_MAP: Record<string, 1 | 2 | 3 | 4> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/**
 * Google types that map onto our meal periods.
 *
 * Every entry is a *set*, because almost nothing serves exactly one sitting: a
 * Chinese restaurant that only claimed `lunch` scored zero meal fit at dinner,
 * and a mamak that only claimed `late` scored zero at breakfast, lunch and tea
 * time — the four hours it is busiest. A wrong-but-confident single period is
 * worse than a broad one, because fit is 18% of the rank.
 */
const PERIOD_TYPES: Record<string, MealPeriod[]> = {
  breakfast_restaurant: ['breakfast', 'brunch'],
  bagel_shop: ['breakfast', 'brunch', 'coffee'],
  brunch_restaurant: ['brunch', 'breakfast', 'lunch'],
  cafe: ['coffee', 'breakfast', 'brunch'],
  coffee_shop: ['coffee', 'breakfast', 'brunch'],
  bakery: ['coffee', 'breakfast'],
  dessert_shop: ['coffee', 'late'],
  tea_house: ['coffee'],
  juice_shop: ['coffee', 'breakfast'],
  fine_dining_restaurant: ['dinner'],
  bar_and_grill: ['dinner', 'late'],
  // Malaysian staples: mamak and kopitiam land under these Google types, and
  // both serve well outside the usual lunch/dinner windows.
  indian_restaurant: ['breakfast', 'lunch', 'dinner', 'late'],
  malaysian_restaurant: ['breakfast', 'lunch', 'dinner'],
  food_court: ['breakfast', 'lunch', 'dinner', 'late'],
  asian_restaurant: ['lunch', 'dinner'],
  chinese_restaurant: ['lunch', 'dinner'],
  indonesian_restaurant: ['lunch', 'dinner'],
  thai_restaurant: ['lunch', 'dinner'],
  japanese_restaurant: ['lunch', 'dinner'],
  korean_restaurant: ['lunch', 'dinner'],
  italian_restaurant: ['lunch', 'dinner'],
  pizza_restaurant: ['lunch', 'dinner', 'late'],
  hamburger_restaurant: ['lunch', 'dinner', 'late'],
  sandwich_shop: ['breakfast', 'lunch'],
  fast_food_restaurant: ['lunch', 'dinner', 'late'],
  meal_takeaway: ['lunch', 'dinner'],
  seafood_restaurant: ['dinner'],
  vegetarian_restaurant: ['lunch', 'dinner'],
  vegan_restaurant: ['lunch', 'dinner'],
};

function toWeeklyHours(place: GooglePlace): WeeklyHours {
  const week: WeeklyHours = Array.from({ length: 7 }, () => []);
  const periods = place.regularOpeningHours?.periods ?? [];

  // A single period with an `open` at 00:00 and no `close` means "always open".
  if (periods.length === 1 && !periods[0].close && periods[0].open) {
    return Array.from({ length: 7 }, () => [{ open: 0, close: 1440 }]);
  }

  for (const period of periods) {
    if (!period.open || !period.close) continue;
    const openMin = period.open.hour * 60 + period.open.minute;
    let closeMin = period.close.hour * 60 + period.close.minute;
    // Closing on a later day means the slot runs past midnight.
    if (period.close.day !== period.open.day || closeMin <= openMin) closeMin += 1440;
    week[period.open.day % 7].push({ open: openMin, close: closeMin });
  }

  for (const day of week) day.sort((a, b) => a.open - b.open);
  return week;
}

function toMealPeriods(types: string[]): Place['mealPeriods'] {
  const found = new Set<MealPeriod>();
  for (const t of types) {
    for (const period of PERIOD_TYPES[t] ?? []) found.add(period);
  }
  // A plain restaurant with no signal is assumed to do the main services.
  if (found.size === 0) return ['lunch', 'dinner'];
  return [...found];
}

function humanTag(type: string): string {
  return type
    .replace(/_restaurant$|_shop$/, '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** "RM 20 – 40" when Google publishes a real range for the place. */
function toPriceText(range?: GooglePlace['priceRange']): string | undefined {
  const start = range?.startPrice?.units;
  const end = range?.endPrice?.units;
  const code = range?.startPrice?.currencyCode ?? range?.endPrice?.currencyCode;
  if (!code || (!start && !end)) return undefined;

  const symbol = code === 'MYR' ? 'RM' : code;
  if (start && end) return `${symbol} ${start}-${end}`;
  return `${symbol} ${start ?? end}+`;
}

function toPlace(g: GooglePlace, apiKey: string): Place | null {
  if (!g.location || !g.displayName?.text) return null;
  // Permanently closed places must never be suggested.
  if (g.businessStatus && g.businessStatus !== 'OPERATIONAL') return null;

  const photoName = g.photos?.[0]?.name;

  return {
    id: g.id,
    // Straight from Google — the app never rewrites a real business name.
    name: g.displayName.text,
    cuisine: g.primaryTypeDisplayName?.text ?? 'Restaurant',
    tags: (g.types ?? []).filter((t) => t !== 'restaurant' && t !== 'food').slice(0, 3).map(humanTag),
    rating: g.rating ?? 0,
    reviewCount: g.userRatingCount ?? 0,
    // Undefined, never a default band. Google leaves `priceLevel` off plenty of
    // operational places, and falling back to 2 printed "$$" against a real
    // restaurant on no evidence — and, worse, let the price filter exclude it
    // on that invented band. Unknown has to stay unknown here too.
    priceLevel: g.priceLevel ? PRICE_MAP[g.priceLevel] : undefined,
    priceText: toPriceText(g.priceRange),
    coords: { lat: g.location.latitude, lng: g.location.longitude },
    address: g.shortFormattedAddress ?? g.formattedAddress ?? '',
    photo: photoName
      ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1000&key=${apiKey}`
      : undefined,
    hours: toWeeklyHours(g),
    // Google publishes no hours for some operational places. Seven empty days
    // are indistinguishable from "shut all week" unless we say which it is.
    hoursUnknown: (g.regularOpeningHours?.periods?.length ?? 0) === 0,
    utcOffsetMinutes: g.utcOffsetMinutes,
    mealPeriods: toMealPeriods(g.types ?? []),
    vegetarianFriendly: g.servesVegetarianFood ?? undefined,
  };
}

const INCLUDED_TYPES = ['restaurant', 'cafe', 'bakery', 'food_court', 'meal_takeaway'];

/** Google caps a single searchNearby response at 20 places. */
const PAGE_SIZE = 20;

async function searchNearby(
  origin: Coords,
  radiusMetres: number,
  apiKey: string,
  rankPreference: 'DISTANCE' | 'POPULARITY',
  signal?: AbortSignal,
): Promise<GooglePlace[]> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: INCLUDED_TYPES,
      maxResultCount: PAGE_SIZE,
      rankPreference,
      // Biases results and formatting to Malaysia: local address formats and
      // the names Malaysian users would actually recognise.
      regionCode: 'MY',
      languageCode: 'en',
      locationRestriction: {
        circle: {
          center: { latitude: origin.lat, longitude: origin.lng },
          radius: Math.min(radiusMetres, 50_000),
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Places request failed (${response.status}). ${body.slice(0, 200)}`);
  }

  const json = (await response.json()) as { places?: GooglePlace[] };
  return json.places ?? [];
}

/**
 * Two passes, merged.
 *
 * One POPULARITY pass alone was the reason the app kept suggesting places that
 * were not actually near you: Google returns the 20 most popular in the whole
 * radius, so in a dense city the mall food halls 2 km away crowd out every
 * shop on your own street, and those never even reach the ranker. DISTANCE
 * alone has the opposite failure — twenty nearest, however grim.
 *
 * Asking for both and de-duplicating gives the ranker what it needs: the
 * genuinely closest places *and* the ones worth a longer walk.
 */
export async function fetchGooglePlaces(
  origin: Coords,
  radiusMetres: number,
  apiKey: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const [nearest, popular] = await Promise.all([
    searchNearby(origin, radiusMetres, apiKey, 'DISTANCE', signal),
    // A weak second pass must not sink the whole fetch; the nearest set alone
    // is still a correct answer.
    searchNearby(origin, radiusMetres, apiKey, 'POPULARITY', signal).catch((e) => {
      if (signal?.aborted) throw e;
      return [] as GooglePlace[];
    }),
  ]);

  const byId = new Map<string, GooglePlace>();
  for (const g of [...nearest, ...popular]) {
    if (g.id && !byId.has(g.id)) byId.set(g.id, g);
  }

  return [...byId.values()]
    .map((p) => toPlace(p, apiKey))
    .filter((p): p is Place => p !== null);
}
