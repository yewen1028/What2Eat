import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { Place } from '../lib/types';

const STORAGE_KEY = 'what2eat.saved.v1';

interface SavedValue {
  /** Newest first. */
  items: Place[];
  ids: Set<string>;
  hydrated: boolean;
  isSaved: (id: string) => boolean;
  toggle: (place: Place) => void;
  remove: (id: string) => void;
}

const SavedContext = createContext<SavedValue | null>(null);

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Place[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw) setItems(JSON.parse(raw) as Place[]);
      })
      .catch(() => {
        // A corrupt cache should not block the app; we start from empty.
      })
      .finally(() => active && setHydrated(true));
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: Place[]) => {
    setItems(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const toggle = useCallback(
    (place: Place) => {
      persist(ids.has(place.id) ? items.filter((i) => i.id !== place.id) : [place, ...items]);
    },
    [ids, items, persist],
  );

  const remove = useCallback(
    (id: string) => persist(items.filter((i) => i.id !== id)),
    [items, persist],
  );

  const value = useMemo<SavedValue>(
    () => ({ items, ids, hydrated, isSaved: (id) => ids.has(id), toggle, remove }),
    [items, ids, hydrated, toggle, remove],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved(): SavedValue {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error('useSaved must be used inside <SavedProvider>');
  return ctx;
}
