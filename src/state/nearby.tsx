import * as Location from 'expo-location';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { distanceMetres } from '../lib/geo';
import { isRoutable, openDirections } from '../lib/maps';
import { isRealSource, loadPlaces, PlacesSource } from '../lib/places';
import { rank } from '../lib/score';
import { mealMomentFor, MealMoment } from '../lib/time';
import { Coords, Filters, Place, Suggestion } from '../lib/types';
import { filtersFromProfile, useProfile } from './profile';
import { useSaved } from './saved';

export type LocationStatus = 'idle' | 'asking' | 'ready' | 'denied' | 'error';

/** Used when the user declines location but still wants to look around. */
const DEMO_ORIGIN: Coords = { lat: 3.1466, lng: 101.7114 };
export const DEMO_AREA_NAME = 'Bukit Bintang, KL';

interface NearbyValue {
  status: LocationStatus;
  origin: Coords | null;
  /** When `origin` was actually read, so the UI can admit to a stale fix. */
  fixedAt: Date | null;
  /** Neighbourhood or city, when reverse geocoding succeeds. */
  areaName: string | null;
  usingDemoLocation: boolean;
  source: PlacesSource;
  /**
   * True when the listings are real businesses — Google *or* OpenStreetMap.
   * This gates the SAMPLE badge and directions, so it asks "are these places
   * real", not "which provider". For provider-specific UI, read `source`.
   */
  isLiveData: boolean;
  warning: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** Ticks every minute so open/closed state and the meal moment stay honest. */
  now: Date;
  moment: MealMoment;
  places: Place[];
  /** Filtered and ranked, best first. */
  suggestions: Suggestion[];
  /** Ranked ignoring filters — used to explain an empty result set. */
  unfilteredCount: number;
  filters: Filters;
  setFilters: (next: Filters) => void;
  resetFilters: () => void;
  /** True when the session's filters differ from the profile defaults. */
  filtersChanged: boolean;
  /** Rotates which of the top results is presented as the hero pick. */
  pickIndex: number;
  shufflePick: () => void;
  requestLocation: () => Promise<void>;
  useDemoLocation: () => void;
  refresh: () => Promise<void>;
  /**
   * A fix read *now*, not the one captured when permission was granted. Handing
   * a place off to Google Maps has to start from where the user is standing at
   * the moment they tap, which is not necessarily where the list was ranked
   * from. Falls back to the stored origin if the read fails, and returns the
   * demo origin unchanged when the demo neighbourhood is in use.
   */
  currentPosition: () => Promise<Coords | null>;
}

const NearbyContext = createContext<NearbyValue | null>(null);

/** How far out we ask the provider to look. */
const SEARCH_RADIUS_M = 2500;

/**
 * Walk minutes and the proximity weight are quoted to the minute, and the whole
 * search circle is 2.5 km. `Balanced` is happy to be 100 m out, which is a
 * block in the wrong direction; `High` costs a little battery on one reading.
 */
const LOCATION_ACCURACY = Location.Accuracy.High;

/** Past this, the old ranking is describing somewhere the user has left. */
const REFETCH_DISTANCE_M = 150;

export function NearbyProvider({ children }: { children: React.ReactNode }) {
  const { profile, hydrated: profileHydrated } = useProfile();
  const profileFilters = useMemo(() => filtersFromProfile(profile), [profile]);

  const [status, setStatus] = useState<LocationStatus>('idle');
  const [origin, setOrigin] = useState<Coords | null>(null);
  const [fixedAt, setFixedAt] = useState<Date | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [usingDemoLocation, setUsingDemoLocation] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [source, setSource] = useState<PlacesSource>('sample');
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(profileFilters);
  const [pickIndex, setPickIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());

  const abortRef = useRef<AbortController | null>(null);
  /** Set once the user edits filters, so a late profile hydrate cannot stomp them. */
  const filtersTouched = useRef(false);

  // The stored profile arrives a tick after mount; adopt it as the baseline
  // unless the user has already narrowed things down by hand.
  useEffect(() => {
    if (profileHydrated && !filtersTouched.current) setFilters(profileFilters);
  }, [profileHydrated, profileFilters]);

  const updateFilters = useCallback((next: Filters) => {
    filtersTouched.current = true;
    setFilters(next);
  }, []);

  const resetFilters = useCallback(() => {
    filtersTouched.current = false;
    setFilters(profileFilters);
  }, [profileFilters]);

  // Keep "open now" and the meal moment accurate without re-fetching.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetchPlaces = useCallback(
    async (coords: Coords, isRefresh = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await loadPlaces(
        coords,
        SEARCH_RADIUS_M,
        profile.placesApiKey,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setPlaces(result.places);
      setSource(result.source);
      setWarning(result.warning ?? null);
      setPickIndex(0);
      setNow(new Date());
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Could not load places nearby.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    },
    [profile.placesApiKey],
  );

  const resolveAreaName = useCallback(async (coords: Coords) => {
    try {
      const [result] = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng,
      });
      const name = result?.district ?? result?.subregion ?? result?.city ?? result?.region;
      setAreaName(name ?? null);
    } catch {
      setAreaName(null);
    }
  }, []);

  const readPosition = useCallback(async (): Promise<Coords> => {
    const position = await Location.getCurrentPositionAsync({ accuracy: LOCATION_ACCURACY });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  }, []);

  const requestLocation = useCallback(async () => {
    setStatus('asking');
    setError(null);
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      const coords = await readPosition();
      setOrigin(coords);
      setFixedAt(new Date());
      setUsingDemoLocation(false);
      setStatus('ready');
      void resolveAreaName(coords);
      await fetchPlaces(coords);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Could not read your location.');
    }
  }, [fetchPlaces, readPosition, resolveAreaName]);

  const useDemoLocation = useCallback(() => {
    setOrigin(DEMO_ORIGIN);
    setFixedAt(new Date());
    setUsingDemoLocation(true);
    setAreaName(DEMO_AREA_NAME);
    setStatus('ready');
    void fetchPlaces(DEMO_ORIGIN);
  }, [fetchPlaces]);

  /**
   * Refresh re-reads the GPS first. Re-fetching against the stored origin was
   * why the list stayed wrong after the user moved: the position was captured
   * once, at permission time, and every later "refresh" faithfully re-ranked
   * around wherever they had been standing then.
   */
  const refresh = useCallback(async () => {
    if (!origin) return;
    setNow(new Date());

    let coords = origin;
    if (!usingDemoLocation) {
      try {
        const fresh = await readPosition();
        // Re-geocode only on a real move; a few metres of GPS jitter should not
        // repaint the area name on every pull.
        if (distanceMetres(origin, fresh) > REFETCH_DISTANCE_M) void resolveAreaName(fresh);
        coords = fresh;
        setOrigin(fresh);
        setFixedAt(new Date());
      } catch {
        // A failed re-read is not a failed refresh — the listings are still
        // worth updating from the last known position.
      }
    }

    await fetchPlaces(coords, true);
  }, [fetchPlaces, origin, readPosition, resolveAreaName, usingDemoLocation]);

  /**
   * Re-reads the GPS on demand without touching the ranking.
   *
   * `refresh` also re-fetches and re-ranks, which is far too much to do behind
   * a Directions tap — the list would reshuffle under the user as the maps app
   * opened. This only moves the origin.
   */
  const currentPosition = useCallback(async (): Promise<Coords | null> => {
    if (usingDemoLocation || status !== 'ready') return origin;
    try {
      const fresh = await readPosition();
      setOrigin(fresh);
      setFixedAt(new Date());
      if (origin && distanceMetres(origin, fresh) > REFETCH_DISTANCE_M) void resolveAreaName(fresh);
      return fresh;
    } catch {
      // A denied or timed-out read still leaves the last known fix, which beats
      // handing the maps app no origin at all.
      return origin;
    }
  }, [origin, readPosition, resolveAreaName, status, usingDemoLocation]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Pasting (or clearing) a Places key should swap the data immediately rather
  // than waiting for the next pull-to-refresh.
  const lastKeyRef = useRef(profile.placesApiKey);
  useEffect(() => {
    if (!profileHydrated || !origin) return;
    if (lastKeyRef.current === profile.placesApiKey) return;
    lastKeyRef.current = profile.placesApiKey;
    void fetchPlaces(origin, true);
  }, [profile.placesApiKey, profileHydrated, origin, fetchPlaces]);

  const suggestions = useMemo(
    () => (origin ? rank(places, origin, now, filters) : []),
    [places, origin, now, filters],
  );

  const unfilteredCount = useMemo(
    () => (origin ? rank(places, origin, now, { ...filters, ...UNFILTERED }).length : 0),
    [places, origin, now, filters],
  );

  const shufflePick = useCallback(() => {
    setPickIndex((i) => (suggestions.length === 0 ? 0 : (i + 1) % Math.min(suggestions.length, 5)));
  }, [suggestions.length]);

  // A shrinking result set must never leave the hero pointing at nothing.
  useEffect(() => {
    setPickIndex((i) => (i >= suggestions.length ? 0 : i));
  }, [suggestions.length]);

  const value = useMemo<NearbyValue>(
    () => ({
      status,
      origin,
      fixedAt,
      areaName,
      usingDemoLocation,
      source,
      isLiveData: isRealSource(source),
      warning,
      loading,
      refreshing,
      error,
      now,
      moment: mealMomentFor(now),
      places,
      suggestions,
      unfilteredCount,
      filters,
      setFilters: updateFilters,
      resetFilters,
      filtersChanged: JSON.stringify(filters) !== JSON.stringify(profileFilters),
      pickIndex,
      shufflePick,
      requestLocation,
      useDemoLocation,
      refresh,
      currentPosition,
    }),
    [
      status,
      origin,
      fixedAt,
      areaName,
      usingDemoLocation,
      source,
      warning,
      loading,
      refreshing,
      error,
      now,
      places,
      suggestions,
      unfilteredCount,
      filters,
      profileFilters,
      updateFilters,
      resetFilters,
      pickIndex,
      shufflePick,
      requestLocation,
      useDemoLocation,
      refresh,
      currentPosition,
    ],
  );

  return <NearbyContext.Provider value={value}>{children}</NearbyContext.Provider>;
}

const UNFILTERED: Partial<Filters> = {
  maxWalkMinutes: Number.POSITIVE_INFINITY,
  minRating: 0,
  openOnly: false,
  priceLevels: [1, 2, 3, 4],
  vegetarianOnly: false,
};

export function useNearby(): NearbyValue {
  const ctx = useContext(NearbyContext);
  if (!ctx) throw new Error('useNearby must be used inside <NearbyProvider>');
  return ctx;
}

export interface DirectionsController {
  /** Reads a live fix, then hands the place to Google Maps. */
  open: (place: Place) => Promise<void>;
  /** True while the fix is being read, so the button can say so. */
  locating: boolean;
  /** False for the fictional sample dataset. */
  routable: (place: Place) => boolean;
  /**
   * Why this place cannot be routed to, ready to show. Null when it can be.
   * Per-place rather than per-session: a sample listing bookmarked before a
   * Places key was added is still fictional after one is.
   */
  blockedReason: (place: Place) => string | null;
}

/**
 * The one way to open directions.
 *
 * Every Directions button goes through this so they all behave the same: read
 * the GPS at the moment of the tap, route from that, and refuse outright on
 * sample data rather than walking someone to an invented address.
 */
export function useDirections(): DirectionsController {
  const { currentPosition } = useNearby();
  const [locating, setLocating] = useState(false);

  const open = useCallback(
    async (place: Place) => {
      if (!isRoutable(place)) return;
      setLocating(true);
      try {
        const here = await currentPosition();
        openDirections(place, here);
      } finally {
        setLocating(false);
      }
    },
    [currentPosition],
  );

  return {
    open,
    locating,
    routable: isRoutable,
    blockedReason: (place) =>
      isRoutable(place)
        ? null
        : 'This is a sample listing, so there is nowhere real to walk to. Add a Google Places key in You → Listings for real places and directions.',
  };
}

/**
 * Looks a place up across everything the app is holding.
 *
 * Bookmarks are the reason this checks more than the nearby results. A saved
 * place is a full `Place` on disk, but it is only in `places` if it happens to
 * be within range of the current fix — so opening one saved in another
 * neighbourhood, or in an earlier session, hit "Place not found" on the tab
 * whose entire purpose is to keep it. The saved copy is the fallback.
 */
export function usePlace(id: string | undefined) {
  const { suggestions, places, origin, now } = useNearby();
  const { items: saved } = useSaved();

  return useMemo(() => {
    if (!id || !origin) return null;
    const existing = suggestions.find((s) => s.place.id === id);
    if (existing) return existing;
    const place = places.find((p) => p.id === id) ?? saved.find((p) => p.id === id);
    if (!place) return null;
    // Filtered out of the current list, but still worth showing on its own page.
    return rank([place], origin, now, {
      maxWalkMinutes: Number.POSITIVE_INFINITY,
      minRating: 0,
      openOnly: false,
      priceLevels: [1, 2, 3, 4],
      vegetarianOnly: false,
    })[0];
  }, [id, suggestions, places, saved, origin, now]);
}
