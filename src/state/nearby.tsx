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

import { loadPlaces, PlacesSource } from '../lib/places';
import { rank } from '../lib/score';
import { mealMomentFor, MealMoment } from '../lib/time';
import { Coords, Filters, Place, Suggestion } from '../lib/types';
import { filtersFromProfile, useProfile } from './profile';

export type LocationStatus = 'idle' | 'asking' | 'ready' | 'denied' | 'error';

/** Used when the user declines location but still wants to look around. */
const DEMO_ORIGIN: Coords = { lat: 51.5142, lng: -0.1265 };

interface NearbyValue {
  status: LocationStatus;
  origin: Coords | null;
  /** Neighbourhood or city, when reverse geocoding succeeds. */
  areaName: string | null;
  usingDemoLocation: boolean;
  source: PlacesSource;
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
}

const NearbyContext = createContext<NearbyValue | null>(null);

/** How far out we ask the provider to look. */
const SEARCH_RADIUS_M = 2500;

export function NearbyProvider({ children }: { children: React.ReactNode }) {
  const { profile, hydrated: profileHydrated } = useProfile();
  const profileFilters = useMemo(() => filtersFromProfile(profile), [profile]);

  const [status, setStatus] = useState<LocationStatus>('idle');
  const [origin, setOrigin] = useState<Coords | null>(null);
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

  const fetchPlaces = useCallback(async (coords: Coords, isRefresh = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await loadPlaces(coords, SEARCH_RADIUS_M, controller.signal);
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
  }, []);

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

  const requestLocation = useCallback(async () => {
    setStatus('asking');
    setError(null);
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: Coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setOrigin(coords);
      setUsingDemoLocation(false);
      setStatus('ready');
      void resolveAreaName(coords);
      await fetchPlaces(coords);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Could not read your location.');
    }
  }, [fetchPlaces, resolveAreaName]);

  const useDemoLocation = useCallback(() => {
    setOrigin(DEMO_ORIGIN);
    setUsingDemoLocation(true);
    setAreaName('Fitzrovia');
    setStatus('ready');
    void fetchPlaces(DEMO_ORIGIN);
  }, [fetchPlaces]);

  const refresh = useCallback(async () => {
    if (!origin) return;
    setNow(new Date());
    await fetchPlaces(origin, true);
  }, [fetchPlaces, origin]);

  useEffect(() => () => abortRef.current?.abort(), []);

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
      areaName,
      usingDemoLocation,
      source,
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
    }),
    [
      status,
      origin,
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

/** Looks a place up across whatever is currently loaded. */
export function usePlace(id: string | undefined) {
  const { suggestions, places, origin, now } = useNearby();
  return useMemo(() => {
    if (!id || !origin) return null;
    const existing = suggestions.find((s) => s.place.id === id);
    if (existing) return existing;
    const place = places.find((p) => p.id === id);
    if (!place) return null;
    // Filtered out of the current list, but still worth showing on its own page.
    return rank([place], origin, now, {
      maxWalkMinutes: Number.POSITIVE_INFINITY,
      minRating: 0,
      openOnly: false,
      priceLevels: [1, 2, 3, 4],
      vegetarianOnly: false,
    })[0];
  }, [id, suggestions, places, origin, now]);
}
