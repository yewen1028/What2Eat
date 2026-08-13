import { MealPeriod, OpenInterval, WeeklyHours } from './types';

export interface MealMoment {
  period: MealPeriod;
  /** Sentence fragment for the headline, e.g. "dinner". */
  label: string;
  /** Greeting used above the headline. */
  greeting: string;
  /** One-line framing of what usually works at this hour. */
  blurb: string;
}

const MOMENTS: Record<MealPeriod, Omit<MealMoment, 'period'>> = {
  breakfast: {
    label: 'breakfast',
    greeting: 'Good morning',
    blurb: 'Kopitiams and early kitchens, before the day starts properly.',
  },
  brunch: {
    label: 'brunch',
    greeting: 'Late start',
    blurb: 'The eggs-and-a-second-coffee window.',
  },
  lunch: {
    label: 'lunch',
    greeting: 'Midday',
    blurb: 'Fast enough to get back, good enough to look forward to.',
  },
  coffee: {
    label: 'tea time',
    greeting: 'Afternoon',
    blurb: 'Kuih, kopi and something small before the evening rush.',
  },
  dinner: {
    label: 'dinner',
    greeting: 'Good evening',
    blurb: 'Kitchens are on and the good tables are still open.',
  },
  late: {
    label: 'supper',
    greeting: 'Still up',
    blurb: 'Mamak and the late kitchens that are genuinely still serving.',
  },
};

/** Chip order, earliest to latest. */
export const MEAL_PERIODS: MealPeriod[] = [
  'breakfast',
  'brunch',
  'lunch',
  'coffee',
  'dinner',
  'late',
];

/** Title-case names for pickers. "Supper" and "Tea time" are the local terms. */
export const MEAL_PERIOD_LABELS: Record<MealPeriod, string> = {
  breakfast: 'Breakfast',
  brunch: 'Brunch',
  lunch: 'Lunch',
  coffee: 'Tea time',
  dinner: 'Dinner',
  late: 'Supper',
};

/** The clock window each period covers, matching `mealPeriodFor`. */
export const MEAL_PERIOD_WINDOWS: Record<MealPeriod, string> = {
  breakfast: '5:00-10:30',
  brunch: '10:30-12:00',
  lunch: '12:00-15:00',
  coffee: '15:00-17:00',
  dinner: '17:00-21:30',
  late: '21:30-5:00',
};

/** Minutes since local midnight. */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function mealPeriodFor(date: Date): MealPeriod {
  const m = minutesOfDay(date);
  if (m < 5 * 60) return 'late';
  if (m < 10 * 60 + 30) return 'breakfast';
  if (m < 12 * 60) return 'brunch';
  if (m < 15 * 60) return 'lunch';
  if (m < 17 * 60) return 'coffee';
  if (m < 21 * 60 + 30) return 'dinner';
  return 'late';
}

export function mealMomentFor(date: Date): MealMoment {
  const period = mealPeriodFor(date);
  return { period, ...MOMENTS[period] };
}

export function formatClock(date: Date): string {
  return date
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function formatMinutesOfDay(minutes: number): string {
  const normalised = ((minutes % 1440) + 1440) % 1440;
  const d = new Date();
  d.setHours(Math.floor(normalised / 60), normalised % 60, 0, 0);
  return formatClock(d);
}

/**
 * Re-expresses an instant as a Date whose local getters read the *place's* wall
 * clock. Opening hours come from Google in the place's own local time, so
 * judging them against the device clock is only right while the two agree — it
 * silently reports every place open (or shut) by the offset otherwise, which is
 * the normal case on a simulator set to another region.
 */
export function placeLocalDate(at: Date, utcOffsetMinutes?: number): Date {
  if (utcOffsetMinutes === undefined) return at;
  return new Date(at.getTime() + (utcOffsetMinutes + at.getTimezoneOffset()) * 60_000);
}

export interface OpenState {
  isOpen: boolean;
  /** Minutes until close, when open. */
  closingInMinutes: number | null;
  /** Minutes until the next opening, when closed. */
  opensInMinutes: number | null;
  /** Today's intervals, for the detail screen. */
  todayIntervals: OpenInterval[];
}

/**
 * Resolves opening state, accounting for intervals that spill past midnight —
 * a place that closes at 02:00 is still open when you check at 00:30.
 */
export function openStateFor(
  hours: WeeklyHours,
  at: Date,
  utcOffsetMinutes?: number,
): OpenState {
  const local = placeLocalDate(at, utcOffsetMinutes);
  const day = local.getDay();
  const now = minutesOfDay(local);
  const today = hours[day] ?? [];
  const yesterday = hours[(day + 6) % 7] ?? [];

  for (const slot of today) {
    if (now >= slot.open && now < slot.close) {
      return {
        isOpen: true,
        closingInMinutes: slot.close - now,
        opensInMinutes: null,
        todayIntervals: today,
      };
    }
  }

  // Yesterday's late slot may still be running (e.g. 20:00 → 26:00).
  for (const slot of yesterday) {
    if (slot.close > 1440 && now < slot.close - 1440) {
      return {
        isOpen: true,
        closingInMinutes: slot.close - 1440 - now,
        opensInMinutes: null,
        todayIntervals: today,
      };
    }
  }

  let opensIn: number | null = null;
  for (const slot of today) {
    if (slot.open > now) {
      opensIn = slot.open - now;
      break;
    }
  }
  if (opensIn === null) {
    const tomorrow = hours[(day + 1) % 7] ?? [];
    if (tomorrow.length > 0) opensIn = 1440 - now + tomorrow[0].open;
  }

  return { isOpen: false, closingInMinutes: null, opensInMinutes: opensIn, todayIntervals: today };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function formatIntervals(intervals: OpenInterval[]): string {
  if (intervals.length === 0) return 'Closed';
  if (intervals.length === 1 && intervals[0].open === 0 && intervals[0].close >= 1440) {
    return 'Open 24 hours';
  }
  return intervals
    .map((i) => {
      const range = `${formatMinutesOfDay(i.open)} - ${formatMinutesOfDay(i.close)}`;
      // A close time past midnight is otherwise indistinguishable from an
      // early-morning one: "12:00 – 2:00" reads as a two-hour lunch service.
      return i.close >= 1440 ? `${range} next day` : range;
    })
    .join(', ');
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Past this, a position fix is old enough to be worth re-reading. */
export const STALE_FIX_MINUTES = 5;

/**
 * How old a GPS fix is, in words.
 *
 * Distances and walk times are quoted to the minute off a single reading, so
 * the app should say how old that reading is rather than implying it is live.
 */
export function formatFixAge(fixedAt: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - fixedAt.getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
}

export function isFixStale(fixedAt: Date | null, now: Date): boolean {
  if (!fixedAt) return false;
  return now.getTime() - fixedAt.getTime() > STALE_FIX_MINUTES * 60_000;
}
