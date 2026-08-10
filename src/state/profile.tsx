import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { setHapticsEnabled } from '../lib/haptics';
import { Filters } from '../lib/types';

const STORAGE_KEY = 'what2eat.profile.v1';

export type Dietary = 'none' | 'vegetarian';

export interface Profile {
  /** Used for the greeting and the avatar monogram. Empty is fine. */
  name: string;
  dietary: Dietary;
  /** Seeds `Filters.maxWalkMinutes`. */
  maxWalkMinutes: number;
  /** Seeds `Filters.minRating`. */
  minRating: number;
  /** Seeds `Filters.priceLevels`. */
  priceLevels: number[];
  openOnly: boolean;
  hapticsEnabled: boolean;
  /**
   * Google Places API key entered in the app, so real listings do not require
   * rebuilding. Stored on this device only and never sent anywhere except
   * Google's Places endpoint.
   */
  placesApiKey: string;
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  dietary: 'none',
  maxWalkMinutes: 20,
  minRating: 4,
  priceLevels: [1, 2, 3, 4],
  openOnly: true,
  hapticsEnabled: true,
  placesApiKey: '',
};

/**
 * Preferences are the *defaults* for the session, not a second filter system —
 * the Filters sheet still overrides them, and "Reset" returns here.
 */
export function filtersFromProfile(p: Profile): Filters {
  return {
    maxWalkMinutes: p.maxWalkMinutes,
    minRating: p.minRating,
    openOnly: p.openOnly,
    priceLevels: p.priceLevels.length > 0 ? p.priceLevels : [1, 2, 3, 4],
    vegetarianOnly: p.dietary === 'vegetarian',
  };
}

interface ProfileValue {
  profile: Profile;
  hydrated: boolean;
  update: (patch: Partial<Profile>) => void;
  reset: () => void;
}

const ProfileContext = createContext<ProfileValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        // Merged over the defaults so a profile written by an older build
        // never leaves a new field undefined.
        const stored = JSON.parse(raw) as Partial<Profile>;
        setProfile({ ...DEFAULT_PROFILE, ...stored });
      })
      .catch(() => {})
      .finally(() => active && setHydrated(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setHapticsEnabled(profile.hapticsEnabled);
  }, [profile.hapticsEnabled]);

  const persist = useCallback((next: Profile) => {
    setProfile(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const update = useCallback(
    (patch: Partial<Profile>) => persist({ ...profile, ...patch }),
    [persist, profile],
  );

  const value = useMemo<ProfileValue>(
    () => ({
      profile,
      hydrated,
      update,
      // Resetting preferences should not silently throw away a key the user
      // pasted in — that is credentials, not a preference.
      reset: () => persist({ ...DEFAULT_PROFILE, placesApiKey: profile.placesApiKey }),
    }),
    [profile, hydrated, update, persist],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}

/** Monogram for the avatar. Falls back to the wordmark's own glyph. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'W2';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
