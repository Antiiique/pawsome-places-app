import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "petfriendly_itineraries";

export interface SavedItinerary {
  id: string;
  name: string;
  depart: { name: string; address: string; lat: number; lng: number };
  arrivee: { name: string; address: string; lat: number; lng: number };
  distance: string;
  duration: string;
  stopsCount: number;
  savedAt: string;
  polyline?: string;
}

function load(): SavedItinerary[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useSavedItineraries() {
  const [itineraries, setItineraries] = useState<SavedItinerary[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itineraries));
  }, [itineraries]);

  const save = useCallback((item: Omit<SavedItinerary, "id" | "savedAt">) => {
    const entry: SavedItinerary = {
      ...item,
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
    };
    setItineraries((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    setItineraries((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearAll = useCallback(() => setItineraries([]), []);

  return { itineraries, save, remove, clearAll, count: itineraries.length };
}
