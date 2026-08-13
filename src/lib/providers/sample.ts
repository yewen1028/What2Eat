import { offsetCoords } from '../geo';
import { Coords, MealPeriod, OpenInterval, Place, WeeklyHours } from '../types';

/** `h(9, 30)` -> minutes since midnight. Values past 24 mean "after midnight". */
const h = (hour: number, minute = 0) => hour * 60 + minute;

const every = (...slots: OpenInterval[]): WeeklyHours => Array.from({ length: 7 }, () => slots);

/** Same hours all week, but closed on the given weekday indices. */
const exceptOn = (closed: number[], ...slots: OpenInterval[]): WeeklyHours =>
  Array.from({ length: 7 }, (_, day) => (closed.includes(day) ? [] : slots));

/** Weekdays vs weekend (Sat = 6, Sun = 0). */
const split = (weekday: OpenInterval[], weekend: OpenInterval[]): WeeklyHours =>
  Array.from({ length: 7 }, (_, day) => (day === 0 || day === 6 ? weekend : weekday));

interface Seed extends Omit<Place, 'id' | 'coords' | 'address'> {
  /** Metres from the user. */
  away: number;
  /** Compass bearing, so the sample map reads as a real neighbourhood. */
  bearing: number;
  street: string;
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=70`;

/**
 * A fictional Malaysian neighbourhood.
 *
 * IMPORTANT: none of these are real businesses. The names are invented on
 * purpose  -  attaching made-up ratings, prices and opening hours to real
 * restaurants would be worse than obviously fake data, because it would
 * misinform about places that actually exist. Real listings come from Google
 * Places once a key is set (You -> Listings); until then every screen showing
 * these carries a SAMPLE badge.
 *
 * What *is* real here is the shape of the data: Malaysian meal patterns, mamak
 * hours that run past midnight, kopitiams that shut mid-afternoon, and RM price
 * bands  -  so the ranking, opening-hours and distance logic get a realistic
 * workout wherever the user actually is.
 */
const SEEDS: Seed[] = [
  {
    name: 'Warung Sri Kejora',
    cuisine: 'Nasi lemak & Malay home cooking',
    tags: ['Sambal', 'Rendang', 'Bungkus'],
    rating: 4.7,
    reviewCount: 2140,
    priceLevel: 1,
    priceText: 'RM 6-14',
    photo: IMG('photo-1596797038530-2c107229654b'),
    hours: every({ open: h(7), close: h(14, 30) }),
    mealPeriods: ['breakfast', 'brunch', 'lunch'],
    typicalWait: 10,
    away: 320,
    bearing: 40,
    street: 'Jalan Kejora 3',
  },
  {
    name: 'Kedai Kopi Sinar Pagi',
    cuisine: 'Kopitiam breakfast',
    tags: ['Roti bakar', 'Half-boiled eggs', 'Kopi O'],
    rating: 4.5,
    reviewCount: 1380,
    priceLevel: 1,
    priceText: 'RM 5-12',
    photo: IMG('photo-1533089860892-a7c6f0a88666'),
    hours: every({ open: h(6, 30), close: h(15) }),
    mealPeriods: ['breakfast', 'brunch', 'coffee'],
    typicalWait: 5,
    away: 180,
    bearing: 310,
    street: 'Jalan Sinar Pagi 1',
    vegetarianFriendly: true,
  },
  {
    name: 'Mee Goreng Pak Amran',
    cuisine: 'Mamak mee goreng',
    tags: ['Mee goreng mamak', 'Teh tarik', 'Open late'],
    rating: 4.6,
    reviewCount: 3260,
    priceLevel: 1,
    priceText: 'RM 7-15',
    photo: IMG('photo-1585032226651-759b368d7246'),
    hours: every({ open: h(11), close: h(26) }),
    mealPeriods: ['lunch', 'dinner', 'late'],
    typicalWait: 8,
    away: 410,
    bearing: 155,
    street: 'Jalan Amran 12',
    vegetarianFriendly: true,
  },
  {
    name: 'Laksa Rumah Teratai',
    cuisine: 'Curry laksa',
    tags: ['Curry laksa', 'Asam laksa', 'Housemade paste'],
    rating: 4.8,
    reviewCount: 1720,
    priceLevel: 1,
    priceText: 'RM 9-16',
    photo: IMG('photo-1455619452474-d2be8b1e70cd'),
    hours: exceptOn([1], { open: h(10), close: h(20) }),
    mealPeriods: ['brunch', 'lunch', 'dinner'],
    typicalWait: 12,
    away: 560,
    bearing: 205,
    street: 'Lorong Teratai 5',
  },
  {
    name: 'Nasi Kandar Bulan Sabit',
    cuisine: 'Nasi kandar',
    tags: ['Kuah campur', 'Ayam goreng', '24 hours'],
    rating: 4.5,
    reviewCount: 4310,
    priceLevel: 1,
    priceText: 'RM 8-18',
    photo: IMG('photo-1626777552726-4a6b54c97e46'),
    hours: every({ open: h(0), close: h(24) }),
    mealPeriods: ['breakfast', 'lunch', 'dinner', 'late'],
    typicalWait: 6,
    away: 700,
    bearing: 250,
    street: 'Jalan Bulan Sabit 8',
  },
  {
    name: 'Sri Anjali Banana Leaf',
    cuisine: 'Banana leaf rice',
    tags: ['Refillable rice', 'Vegetarian kitchen', 'Rasam'],
    rating: 4.7,
    reviewCount: 2680,
    priceLevel: 2,
    priceText: 'RM 12-25',
    photo: IMG('photo-1567337710282-00832b415979'),
    hours: every({ open: h(11), close: h(22) }),
    mealPeriods: ['lunch', 'dinner'],
    typicalWait: 14,
    away: 880,
    bearing: 100,
    street: 'Jalan Anjali 2',
    vegetarianFriendly: true,
  },
  {
    name: 'Biryani House Zamrud',
    cuisine: 'Nasi biryani',
    tags: ['Dum biryani', 'Mutton', 'Family portions'],
    rating: 4.6,
    reviewCount: 1490,
    priceLevel: 2,
    priceText: 'RM 15-30',
    photo: IMG('photo-1631515243349-e0cb75fb8d3a'),
    hours: exceptOn([2], { open: h(11, 30), close: h(22) }),
    mealPeriods: ['lunch', 'dinner'],
    typicalWait: 15,
    away: 1050,
    bearing: 190,
    street: 'Jalan Zamrud 9',
  },
  {
    name: 'Dim Sum Mutiara',
    cuisine: 'Dim sum',
    tags: ['Push carts', 'Morning only', 'Groups'],
    rating: 4.4,
    reviewCount: 2010,
    priceLevel: 2,
    priceText: 'RM 15-35',
    photo: IMG('photo-1606491956689-2ea866880c84'),
    hours: every({ open: h(7), close: h(14) }),
    mealPeriods: ['breakfast', 'brunch'],
    typicalWait: 20,
    away: 640,
    bearing: 20,
    street: 'Jalan Mutiara 4',
  },
  {
    name: 'Nasi Goreng Kampung Zaiton',
    cuisine: 'Nasi goreng',
    tags: ['Kampung style', 'Supper', 'Takeaway'],
    rating: 4.4,
    reviewCount: 1860,
    priceLevel: 1,
    priceText: 'RM 8-16',
    photo: IMG('photo-1603133872878-684f208fb84b'),
    hours: every({ open: h(17), close: h(27) }),
    mealPeriods: ['dinner', 'late'],
    typicalWait: 7,
    away: 470,
    bearing: 130,
    street: 'Jalan Zaiton 7',
  },
  {
    name: 'Sup Daging Wira',
    cuisine: 'Beef noodle soup',
    tags: ['Slow-cooked broth', 'Counter seats', 'Solo-friendly'],
    rating: 4.6,
    reviewCount: 940,
    priceLevel: 1,
    priceText: 'RM 10-18',
    photo: IMG('photo-1582878826629-29b7ad1cdc43'),
    hours: every({ open: h(10), close: h(21) }),
    mealPeriods: ['lunch', 'dinner'],
    typicalWait: 6,
    away: 260,
    bearing: 80,
    street: 'Jalan Wira 6',
  },
  {
    name: 'Ayam Goreng Bertuah',
    cuisine: 'Fried chicken',
    tags: ['Ayam goreng berempah', 'Quick', 'Bungkus'],
    rating: 4.3,
    reviewCount: 2750,
    priceLevel: 1,
    priceText: 'RM 7-14',
    photo: IMG('photo-1626082927389-6cd097cdc6ec'),
    hours: every({ open: h(11), close: h(23) }),
    mealPeriods: ['lunch', 'dinner', 'late'],
    typicalWait: 5,
    away: 380,
    bearing: 285,
    street: 'Jalan Bertuah 11',
  },
  {
    name: 'Kopi & Kaya Lorong Empat',
    cuisine: 'Specialty coffee',
    tags: ['Local beans', 'Kaya toast', 'Laptop-friendly'],
    rating: 4.7,
    reviewCount: 620,
    priceLevel: 2,
    priceText: 'RM 12-24',
    photo: IMG('photo-1554118811-1e0d58224f24'),
    hours: every({ open: h(8), close: h(18) }),
    mealPeriods: ['breakfast', 'brunch', 'coffee'],
    typicalWait: 4,
    away: 210,
    bearing: 350,
    street: 'Lorong Empat 14',
    vegetarianFriendly: true,
  },
  {
    name: 'Bakeri Bunga Raya',
    cuisine: 'Bakery',
    tags: ['Roti', 'Kuih', 'Afternoon batch'],
    rating: 4.5,
    reviewCount: 830,
    priceLevel: 1,
    priceText: 'RM 4-12',
    photo: IMG('photo-1547592180-85f173990554'),
    hours: every({ open: h(8), close: h(20) }),
    mealPeriods: ['breakfast', 'coffee'],
    typicalWait: 3,
    away: 540,
    bearing: 330,
    street: 'Jalan Bunga Raya 20',
    vegetarianFriendly: true,
  },
  {
    name: 'Dapur Hijau',
    cuisine: 'Vegetarian',
    tags: ['Meat-free', 'Salads', 'Gluten-free options'],
    rating: 4.5,
    reviewCount: 510,
    priceLevel: 2,
    priceText: 'RM 14-28',
    photo: IMG('photo-1546069901-ba9599a7e63c'),
    hours: split([{ open: h(11), close: h(20) }], [{ open: h(11), close: h(17) }]),
    mealPeriods: ['lunch', 'dinner'],
    typicalWait: 5,
    away: 760,
    bearing: 60,
    street: 'Jalan Hijau 1',
    vegetarianFriendly: true,
  },
  {
    name: 'Ikan Bakar Tepi Tasik',
    cuisine: 'Grilled seafood',
    tags: ['Ikan bakar', 'Lakeside', 'Groups'],
    rating: 4.6,
    reviewCount: 1930,
    priceLevel: 2,
    priceText: 'RM 25-55',
    photo: IMG('photo-1559339352-11d035aa65de'),
    hours: every({ open: h(17), close: h(23, 30) }),
    mealPeriods: ['dinner', 'late'],
    typicalWait: 18,
    away: 1320,
    bearing: 220,
    street: 'Persiaran Tasik 2',
  },
  {
    name: 'Mamak Corner Bintang Tujuh',
    cuisine: 'Mamak',
    tags: ['24 hours', 'Roti canai', 'Teh tarik'],
    rating: 4.2,
    reviewCount: 5120,
    priceLevel: 1,
    priceText: 'RM 5-13',
    photo: IMG('photo-1585937421612-70a008356fbe'),
    hours: every({ open: h(0), close: h(24) }),
    mealPeriods: ['breakfast', 'lunch', 'dinner', 'late'],
    typicalWait: 5,
    away: 300,
    bearing: 170,
    street: 'Jalan Bintang Tujuh 5',
    vegetarianFriendly: true,
  },
  {
    name: 'Karipap Cik Rohana',
    cuisine: 'Kuih & snacks',
    tags: ['Karipap panas', 'Cash only', 'Takeaway'],
    rating: 4.8,
    reviewCount: 460,
    priceLevel: 1,
    priceText: 'RM 2-8',
    photo: IMG('photo-1601050690597-df0568f70950'),
    hours: every({ open: h(14), close: h(19) }),
    mealPeriods: ['coffee'],
    typicalWait: 4,
    away: 240,
    bearing: 120,
    street: 'Jalan Rohana 8',
    vegetarianFriendly: true,
  },
  {
    name: 'Prawn Mee Jalan Merbau',
    cuisine: 'Hokkien prawn mee',
    tags: ['Prawn stock', 'Morning only', 'Old shop'],
    rating: 4.7,
    reviewCount: 1240,
    priceLevel: 1,
    priceText: 'RM 9-17',
    photo: IMG('photo-1569718212165-3a8278d5f624'),
    hours: exceptOn([3], { open: h(7), close: h(13) }),
    mealPeriods: ['breakfast', 'brunch'],
    typicalWait: 12,
    away: 620,
    bearing: 300,
    street: 'Jalan Merbau 15',
  },
  {
    name: 'Meja Sembilan',
    cuisine: 'Modern Malaysian',
    tags: ['Tasting menu', 'Booking only', 'Occasion'],
    rating: 4.9,
    reviewCount: 380,
    priceLevel: 4,
    priceText: 'RM 180-260',
    photo: IMG('photo-1517248135467-4c7edcad34c4'),
    hours: exceptOn([0, 1], { open: h(18, 30), close: h(22, 30) }),
    mealPeriods: ['dinner'],
    typicalWait: 0,
    away: 1180,
    bearing: 15,
    street: 'Jalan Sembilan 9',
  },
];

/** The id prefix every sample listing carries. Owned here, checked elsewhere. */
const SAMPLE_ID_PREFIX = 'sample-';

/**
 * True for the invented listings.
 *
 * Saved places outlive the session that created them, so "is this real?" cannot
 * be answered by the current `isLiveData` flag alone: a place bookmarked before
 * a Places key was added is still fictional afterwards. The id travels with the
 * place, so it is the honest thing to ask.
 */
export function isSamplePlace(place: Pick<Place, 'id'>): boolean {
  return place.id.startsWith(SAMPLE_ID_PREFIX);
}

/** Builds the sample neighbourhood around a given origin. */
export function samplePlaces(origin: Coords): Place[] {
  return SEEDS.map((seed, index) => {
    const { away, bearing, street, ...rest } = seed;
    return {
      ...rest,
      id: `${SAMPLE_ID_PREFIX}${index}`,
      coords: offsetCoords(origin, away, bearing),
      address: street,
    } satisfies Place;
  });
}

export const SAMPLE_MEAL_PERIODS: MealPeriod[] = [
  'breakfast',
  'brunch',
  'lunch',
  'coffee',
  'dinner',
  'late',
];

