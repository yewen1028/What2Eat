import { Coords, Place, WeeklyHours } from '../types';

/**
 * Google Places API (New) provider.
 *
 * Optional: the app runs on the sample dataset until a key is supplied. Put one
 * in `app.json` under `expo.extra.googlePlacesApiKey`, or set
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

/** Google types that map onto our meal periods. */
const PERIOD_TYPES: Record<string, Place['mealPeriods'][number]> = {
  breakfast_restaurant: 'breakfast',
  bagel_shop: 'breakfast',
  brunch_restaurant: 'brunch',
  cafe: 'coffee',
  coffee_shop: 'coffee',
  bakery: 'coffee',
  dessert_shop: 'coffee',
  tea_house: 'coffee',
  juice_shop: 'coffee',
  fine_dining_restaurant: 'dinner',
  bar_and_grill: 'dinner',
  // Malaysian staples: mamak and kopitiam land under these Google types, and
  // both serve well outside the usual lunch/dinner windows.
  indian_restaurant: 'late',
  asian_restaurant: 'lunch',
  chinese_restaurant: 'lunch',
  malaysian_restaurant: 'lunch',
  indonesian_restaurant: 'lunch',
  thai_restaurant: 'lunch',
  seafood_restaurant: 'dinner',
  vegetarian_restaurant: 'lunch',
  food_court: 'lunch',
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
  const found = new Set<Place['mealPeriods'][number]>();
  for (const t of types) {
    const period = PERIOD_TYPES[t];
    if (period) found.add(period);
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
  if (start && end) return `${symbol} ${start}–${end}`;
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
    priceLevel: (g.priceLevel && PRICE_MAP[g.priceLevel]) || 2,
    priceText: toPriceText(g.priceRange),
    coords: { lat: g.location.latitude, lng: g.location.longitude },
    address: g.shortFormattedAddress ?? g.formattedAddress ?? '',
    photo: photoName
      ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1000&key=${apiKey}`
      : undefined,
    hours: toWeeklyHours(g),
    mealPeriods: toMealPeriods(g.types ?? []),
    vegetarianFriendly: g.servesVegetarianFood ?? undefined,
  };
}

export async function fetchGooglePlaces(
  origin: Coords,
  radiusMetres: number,
  apiKey: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: [
        'restaurant',
        'cafe',
        'bakery',
        'food_court',
        'meal_takeaway',
      ],
      maxResultCount: 20,
      rankPreference: 'POPULARITY',
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
  return (json.places ?? [])
    .map((p) => toPlace(p, apiKey))
    .filter((p): p is Place => p !== null);
}
