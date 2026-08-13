export type MealPeriod = 'breakfast' | 'brunch' | 'lunch' | 'coffee' | 'dinner' | 'late';

export interface Coords {
  lat: number;
  lng: number;
}

/** Opening interval in minutes from local midnight. `close` may exceed 1440 for
 *  places that run past midnight (e.g. 1140 → 1560 is 19:00 → 02:00). */
export interface OpenInterval {
  open: number;
  close: number;
}

/** Index 0 = Sunday, matching `Date.prototype.getDay()`. */
export type WeeklyHours = OpenInterval[][];

export interface Place {
  id: string;
  name: string;
  /** Short human label, e.g. "Ramen", "Neapolitan pizza". */
  cuisine: string;
  /** Free-form tags used for filtering and the "why this" rationale. */
  tags: string[];
  rating: number;
  reviewCount: number;
  /** 1–4, mirroring the familiar $–$$$$ convention. */
  priceLevel: 1 | 2 | 3 | 4;
  /** Real per-person range in local currency when the provider publishes one. */
  priceText?: string;
  coords: Coords;
  address: string;
  photo?: string;
  hours: WeeklyHours;
  /**
   * The place's offset from UTC, in minutes. `hours` are in the *place's* local
   * time, which is not the device's when the phone is roaming or a simulator is
   * set to another region. Undefined means "assume the device clock".
   */
  utcOffsetMinutes?: number;
  /** Meal periods this place actually suits. */
  mealPeriods: MealPeriod[];
  /** Typical wait in minutes at peak. Used to break ties. */
  typicalWait?: number;
  vegetarianFriendly?: boolean;
}

/** A `Place` enriched with everything derived from the user's here-and-now. */
export interface Suggestion {
  place: Place;
  /** Metres. */
  distance: number;
  /** Minutes on foot at 80 m/min. */
  walkMinutes: number;
  isOpen: boolean;
  /** Minutes until close, when open and closing within the hour. */
  closingInMinutes: number | null;
  /** Minutes until it opens, when currently closed. */
  opensInMinutes: number | null;
  score: number;
  /** The weighted parts behind `score`, so the ranking can be shown, not just asserted. */
  breakdown: ScoreBreakdown;
  /** Short phrases explaining the ranking, most important first. */
  reasons: string[];
}

export interface ScoreComponent {
  /** 0–1 before weighting. */
  value: number;
  /** How much this component contributed to the final score. */
  weighted: number;
  /** Plain-language statement of the input, e.g. "480 m away". */
  detail: string;
}

export interface ScoreBreakdown {
  /** Rating, weighted by how many people actually rated it. */
  quality: ScoreComponent;
  /** How far the user would walk from their current position. */
  proximity: ScoreComponent;
  /** Whether the kitchen suits the current hour. */
  fit: ScoreComponent;
  /** Open, and open long enough to be worth the walk. */
  timing: ScoreComponent;
}

export interface Filters {
  maxWalkMinutes: number;
  minRating: number;
  openOnly: boolean;
  priceLevels: number[];
  vegetarianOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  maxWalkMinutes: 20,
  minRating: 4,
  openOnly: true,
  priceLevels: [1, 2, 3, 4],
  vegetarianOnly: false,
};
